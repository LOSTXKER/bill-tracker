"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, ExternalLink, Link2 } from "lucide-react";

interface ReferenceUrlsViewProps {
  mode: "view";
  referenceUrls: string[];
}

interface ReferenceUrlsEditProps {
  mode: "edit";
  referenceUrls: string[];
  onReferenceUrlsChange: (urls: string[]) => void;
}

type ReferenceUrlsSectionProps = ReferenceUrlsViewProps | ReferenceUrlsEditProps;

export function ReferenceUrlsSection(props: ReferenceUrlsSectionProps) {
  if (props.mode === "view") {
    return <ReferenceUrlsView urls={props.referenceUrls} />;
  }
  return (
    <ReferenceUrlsEdit
      urls={props.referenceUrls}
      onChange={props.onReferenceUrlsChange}
    />
  );
}

function ReferenceUrlsView({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">ลิงค์อ้างอิง</p>
      <div className="space-y-2">
        {urls.map((url, index) => (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{url}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function ReferenceUrlsEdit({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const [newReferenceUrl, setNewReferenceUrl] = useState("");

  const addReferenceUrl = () => {
    if (!newReferenceUrl.trim()) return;
    let url = newReferenceUrl.trim();

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      new URL(url);
    } catch {
      return;
    }

    if (!urls.includes(url)) {
      onChange([...urls, url]);
    }
    setNewReferenceUrl("");
  };

  const removeReferenceUrl = (urlToRemove: string) => {
    onChange(urls.filter((url) => url !== urlToRemove));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        ลิงค์อ้างอิง
      </Label>

      {urls.length > 0 && (
        <div className="space-y-2 mb-2">
          {urls.map((url, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg group"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1"
              >
                {url}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeReferenceUrl(url)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="พิมพ์ลิงค์ เช่น shopee.co.th/..."
          value={newReferenceUrl}
          onChange={(e) => setNewReferenceUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addReferenceUrl();
            }
          }}
          className="h-10 bg-muted/30 border-border focus:bg-background"
        />
        <Button
          type="button"
          variant="default"
          size="icon"
          className="h-10 w-10 flex-shrink-0 bg-primary hover:bg-primary/90"
          onClick={addReferenceUrl}
          disabled={!newReferenceUrl.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        เพิ่มลิงค์สินค้า, ลิงค์ติดตามพัสดุ, หรือลิงค์อ้างอิงอื่นๆ (ระบบจะเติม https:// ให้อัตโนมัติ)
      </p>
    </div>
  );
}
