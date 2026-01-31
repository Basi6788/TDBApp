import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, editPrompt } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!editPrompt) {
      return new Response(
        JSON.stringify({ error: "No edit instructions provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Editing image with prompt:", editPrompt.substring(0, 100));

    // Clean up base64 - remove data URL prefix if present
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Edit this image according to these instructions: ${editPrompt}. Generate a new version of this image with the requested changes applied. Make sure to output an image.`
              },
              { 
                type: "image_url", 
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } 
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to edit image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Edit image response structure:", JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasImages: !!data.choices?.[0]?.message?.images,
      imagesLength: data.choices?.[0]?.message?.images?.length,
      contentType: typeof data.choices?.[0]?.message?.content
    }));

    // Extract image from response - check multiple possible locations
    const message = data.choices?.[0]?.message;
    let editedImageBase64 = null;
    
    // Check images array in message (Gemini format)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const imageData = message.images[0];
      if (imageData?.image_url?.url) {
        editedImageBase64 = imageData.image_url.url;
        console.log("Found image in message.images array");
      }
    }
    
    // Fallback: Check content as array
    if (!editedImageBase64 && Array.isArray(message?.content)) {
      const imagePart = message.content.find((part: any) => 
        part.type === 'image_url' || part.inline_data || part.image
      );
      if (imagePart?.inline_data?.data) {
        editedImageBase64 = `data:${imagePart.inline_data.mime_type || 'image/png'};base64,${imagePart.inline_data.data}`;
        console.log("Found image in content inline_data");
      } else if (imagePart?.image_url?.url) {
        editedImageBase64 = imagePart.image_url.url;
        console.log("Found image in content image_url");
      }
    }

    if (!editedImageBase64) {
      console.log("No edited image found in response. Full response:", JSON.stringify(data).substring(0, 1000));
      return new Response(
        JSON.stringify({ error: "Failed to edit image - no image in response. Try different edit instructions." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Image edited successfully, base64 length:", editedImageBase64.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageBase64: editedImageBase64.startsWith('data:') ? editedImageBase64 : `data:image/png;base64,${editedImageBase64}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in edit-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
