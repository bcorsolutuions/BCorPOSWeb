"use client";

import { Search } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";

export function SearchInput(props: InputProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="ps-9" {...props} />
    </div>
  );
}
