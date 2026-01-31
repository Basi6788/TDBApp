import { useState } from 'react';

interface LookupResult {
  full_name?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  [key: string]: string | undefined;
}

interface ApiResponse {
  success: boolean;
  data?: {
    records_count: number;
    records: LookupResult[];
  };
  credit?: string;
  error?: string;
}

interface LookupResponse {
  data: LookupResult[];
  recordsCount: number;
  error: string | null;
  isLoading: boolean;
  search: (number: string) => Promise<boolean>; // Returns true if successful
  clearResults: () => void;
}

export const useNumberLookup = (): LookupResponse => {
  const [data, setData] = useState<LookupResult[]>([]);
  const [recordsCount, setRecordsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const search = async (number: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setData([]);
    setRecordsCount(0);

    const targetUrl = `https://fam-official.serv00.net/api/famdatabase.php?number=${encodeURIComponent(number)}`;
    
    // Multiple CORS proxy options for redundancy
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://proxy.cors.sh/${targetUrl}`,
    ];

    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.log(`Proxy ${proxyUrl} returned status ${response.status}`);
          continue;
        }

        const text = await response.text();
        
        if (!text || text.trim() === '') {
          continue;
        }

        let result;
        try {
          result = JSON.parse(text);
        } catch {
          console.log('Failed to parse response as JSON');
          continue;
        }

        // Parse actual API response format
        const apiResponse = result as ApiResponse;
        
        if (apiResponse.success && apiResponse.data?.records) {
          if (apiResponse.data.records.length === 0) {
            setError('No records found for this number');
            setIsLoading(false);
            return false; // No records found - don't charge credit
          } else {
            setData(apiResponse.data.records);
            setRecordsCount(apiResponse.data.records_count || apiResponse.data.records.length);
            setIsLoading(false);
            return true; // Success - charge credit
          }
        } else if (apiResponse.error) {
          setError(apiResponse.error);
          setIsLoading(false);
          return false; // Error - don't charge credit
        } else if (Array.isArray(result)) {
          // Fallback for array response
          if (result.length === 0) {
            setError('No records found for this number');
            setIsLoading(false);
            return false; // No records found - don't charge credit
          } else {
            setData(result);
            setRecordsCount(result.length);
            setIsLoading(false);
            return true; // Success - charge credit
          }
        }
      } catch (err) {
        console.log(`Proxy failed:`, err);
        continue;
      }
    }

    // All proxies failed - show error instead of mock data
    setError('Unable to connect to database. Please try again.');
    setIsLoading(false);
    return false; // Failed - don't charge credit
  };

  const clearResults = () => {
    setData([]);
    setRecordsCount(0);
    setError(null);
  };

  return { data, recordsCount, error, isLoading, search, clearResults };
};
