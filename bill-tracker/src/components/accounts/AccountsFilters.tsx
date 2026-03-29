import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, CheckCircle2, XCircle, Cloud, PenTool } from "lucide-react";
import { ACCOUNT_CLASS_LABELS, type Account } from "./accounts-table-config";

interface AccountsFiltersProps {
  accounts: Account[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedClass: string | null;
  setSelectedClass: (v: string | null) => void;
  selectedSource: string | null;
  setSelectedSource: (v: string | null) => void;
  selectedStatus: string | null;
  setSelectedStatus: (v: string | null) => void;
}

export function AccountsFilters({
  accounts,
  searchQuery,
  setSearchQuery,
  selectedClass,
  setSelectedClass,
  selectedSource,
  setSelectedSource,
  selectedStatus,
  setSelectedStatus,
}: AccountsFiltersProps) {
  const clearFilters = () => {
    setSelectedClass(null);
    setSelectedSource(null);
    setSelectedStatus(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ค้นหาและกรอง</CardTitle>
        <CardDescription>ค้นหาและกรองบัญชีตามประเภท</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วยรหัส ชื่อ หรือคีย์เวิร์ด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedClass === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedClass(null)}
          >
            ทั้งหมด ({accounts.length})
          </Button>
          {Object.entries(ACCOUNT_CLASS_LABELS).map(([classKey, { label }]) => {
            const count = accounts.filter((a) => a.class === classKey).length;
            if (count === 0) return null;
            return (
              <Button
                key={classKey}
                variant={selectedClass === classKey ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedClass(classKey)}
              >
                {label} ({count})
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">กรอง:</span>
          </div>

          <Select
            value={selectedSource || "all"}
            onValueChange={(value) => setSelectedSource(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="แหล่งที่มา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกแหล่งที่มา</SelectItem>
              <SelectItem value="PEAK">
                <span className="flex items-center gap-1">
                  <Cloud className="h-3 w-3" /> Peak
                </span>
              </SelectItem>
              <SelectItem value="MANUAL">
                <span className="flex items-center gap-1">
                  <PenTool className="h-3 w-3" /> สร้างเอง
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedStatus || "all"}
            onValueChange={(value) => setSelectedStatus(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="active">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> ใช้งาน
                </span>
              </SelectItem>
              <SelectItem value="inactive">
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> ปิดใช้งาน
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {(selectedSource || selectedStatus || selectedClass) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              ล้างตัวกรอง
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
