import { useEffect, useRef, useState } from 'react';
import { AlertCircle, FileX, Database, Download, FileText, FileSpreadsheet, File, ChevronDown } from 'lucide-react';
import gsap from 'gsap';
import { jsPDF } from 'jspdf';
import ResultCard from './ResultCard';
import CopyButton from './CopyButton';
import AnimatedIcon from './AnimatedIcon';
import AdBanner from './AdBanner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ResultData {
  NAME?: string;
  CNIC?: string;
  ADDRESS?: string;
  MOBILE?: string;
  [key: string]: string | undefined;
}

interface ResultsSectionProps {
  data: ResultData[];
  recordsCount: number;
  error: string | null;
  isLoading: boolean;
  showAds?: boolean;
}

const ResultsSection = ({ data, recordsCount, error, isLoading, showAds = true }: ResultsSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    if (error && errorRef.current) {
      gsap.fromTo(
        errorRef.current,
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' }
      );
    }
  }, [error]);

  useEffect(() => {
    if (data.length > 0 && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4 }
      );
    }
  }, [data]);

  const getAllResultsText = () => {
    return data
      .map((item, index) => {
        const entries = Object.entries(item)
          .filter(([_, value]) => value)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        return `--- Record ${index + 1} ---\n${entries}`;
      })
      .join('\n\n');
  };

  const downloadAsTxt = () => {
    const content = getAllResultsText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsCsv = () => {
    const headers = Object.keys(data[0] || {}).filter(key => data.some(item => item[key]));
    const csvRows = [headers.join(',')];
    
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header] || '';
        return `"${value.replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });
    
    const content = csvRows.join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsPdf = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    
    doc.setFontSize(18);
    doc.text('Search Results', 20, yPosition);
    yPosition += 15;
    
    data.forEach((item, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text(`Record ${index + 1}`, 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      Object.entries(item)
        .filter(([_, value]) => value)
        .forEach(([key, value]) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`${key}: ${value}`, 25, yPosition);
          yPosition += 6;
        });
      
      yPosition += 10;
    });
    
    doc.save('results.pdf');
  };

  if (isLoading) return null;

  if (error) {
    return (
      <div
        ref={errorRef}
        className="glass-card rounded-2xl p-8 text-center max-w-md mx-auto mt-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AnimatedIcon icon={AlertCircle} className="w-8 h-8 text-destructive" animate={false} />
        </div>
        <h3 className="font-display font-semibold text-lg mb-2">No Results Found</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div ref={containerRef} className="mt-10 relative z-10">
      {/* Results Count Badge */}
      <div className="flex justify-center mb-6">
        <div className="glass-card rounded-full px-5 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm text-muted-foreground">API Response: </span>
            <span className="font-bold text-gradient">{recordsCount}</span>
            <span className="text-sm text-muted-foreground"> record{recordsCount !== 1 ? 's' : ''} found</span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Liquid Glass Bubble */}
      <div className="flex justify-center mb-6">
        <div className="liquid-glass-btn rounded-full px-4 py-2 flex items-center gap-3">
          {/* Copy All Button */}
          <CopyButton
            text={getAllResultsText()}
            label={`Copy All (${data.length})`}
            variant="full"
          />
          
          <div className="w-px h-6 bg-border/50" />
          
          {/* Download Dropdown */}
          <DropdownMenu open={downloadOpen} onOpenChange={setDownloadOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="liquid-glass-btn min-w-[160px] z-50 bg-popover">
              <DropdownMenuItem onClick={downloadAsCsv} className="cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download as .CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsPdf} className="cursor-pointer">
                <File className="w-4 h-4 mr-2" />
                Download as .PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsTxt} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2" />
                Download as .TXT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Results with Ads after each result */}
      <div className="space-y-6">
        {data.map((item, index) => (
          <div key={index}>
            {/* Result Card */}
            <div className="grid gap-6 md:grid-cols-1 max-w-2xl mx-auto">
              <ResultCard data={item} index={index} />
            </div>
            
            {/* Ad after each result */}
            {showAds && (
              <div className="max-w-2xl mx-auto mt-4">
                <p className="text-xs text-muted-foreground text-center mb-2">Sponsored</p>
                <AdBanner 
                  className="rounded-xl overflow-hidden" 
                  slot="1193846219"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state for no valid data */}
      {data.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <AnimatedIcon icon={FileX} className="w-8 h-8 text-muted-foreground" animate={false} />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">No Data Available</h3>
          <p className="text-muted-foreground">
            The search returned empty results. Try a different number.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsSection;
