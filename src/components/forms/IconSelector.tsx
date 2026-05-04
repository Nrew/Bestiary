import { useId, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { capitalize } from "@/lib/utils";

import { Icon } from "@/components/shared/Icon";
import { iconRegistry, IconCategory } from "@/lib/dnd/icon-resolver";


const allIcons = Object.entries(iconRegistry).flatMap(([category, icons]) =>
  Object.entries(icons).map(([name]) => ({
    id: `${category}/${name}`,
    category: capitalize(category),
    name: name,
  }))
);

interface IconSelectorProps {
  value: string; // e.g., "status/poisoned"
  onValueChange: (value: string) => void;
  label?: string;
  id?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
}

export function IconSelector({
  value,
  onValueChange,
  label = "Icon",
  id,
  ariaDescribedBy,
  ariaInvalid,
}: IconSelectorProps) {
  const generatedTriggerId = useId();
  const triggerId = id ?? generatedTriggerId;
  const searchId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedCategory, selectedName] = useMemo((): [IconCategory | undefined, string | undefined] => {
    if (!value) return [undefined, undefined];
    const parts = value.split('/');
    if (parts.length !== 2) return [undefined, undefined];
    return [parts[0], parts[1]];
  }, [value]);

  const filteredIcons = useMemo(() => {
    const searchLower = search.toLowerCase();
    const filtered = searchLower
      ? allIcons.filter((icon) => icon.id.toLowerCase().includes(searchLower))
      : allIcons;

    // Group icons by their capitalized category name for display.
    return filtered.reduce((acc, icon) => {
      if (!acc[icon.category]) {
        acc[icon.category] = [];
      }
      acc[icon.category].push(icon);
      return acc;
    }, {} as Record<string, typeof allIcons>);
  }, [search]);

  return (
    <div className="space-y-2">
      <Label htmlFor={triggerId}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            variant="outline"
            className="w-full justify-start gap-3"
            aria-invalid={ariaInvalid || undefined}
            aria-describedby={ariaDescribedBy}
          >
            {selectedCategory && selectedName ? (
              <Icon
                category={selectedCategory}
                name={selectedName}
                size="sm"
                aria-label={value || "No icon selected"}
              />
            ) : (
              <div className="w-4 h-4" /> // Placeholder for when no icon is selected.
            )}
            <span className="truncate">{value || "Select icon..."}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(calc(100vw-2rem),360px)] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Label htmlFor={searchId} className="sr-only">Search icons</Label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={searchId}
                placeholder="Search icons..."
                aria-label="Search icons"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <ScrollArea className="h-80">
            <div className="p-2">
              {Object.entries(filteredIcons).map(([category, icons]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground px-2 mb-1">
                    {category}
                  </h4>
                  <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
                    {icons.map((icon) => {
                      const isSelected = value === icon.id;
                      return (
                      <Button
                        key={icon.id}
                        variant={isSelected ? "secondary" : "ghost"}
                        size="icon"
                        className="w-10 h-10"
                        onClick={() => {
                          onValueChange(icon.id);
                          setOpen(false);
                        }}
                        aria-pressed={isSelected}
                        aria-label={`Select ${icon.id} icon`}
                        title={icon.id}
                      >
                        <Icon
                          category={icon.category.toLowerCase()}
                          name={icon.name}
                          size="md"
                          aria-label={icon.id}
                        />
                      </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
