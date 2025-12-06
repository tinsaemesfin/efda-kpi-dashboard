"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon, ChevronLeftIcon, HomeIcon, DownloadIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { KPIDrillDownData, IndividualApplication, ProcessingStageDrillDown } from "@/types/ma-drilldown";

interface MADrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: KPIDrillDownData;
}

export function MADrillDownModal({ open, onOpenChange, data }: MADrillDownModalProps) {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [selectedCategories, setSelectedCategories] = useState<Array<string>>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ level: number; label: string; category?: string }>>([
    { level: 1, label: data.kpiName },
  ]);

  // Reset state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentLevel(1);
      setSelectedCategories([]);
      setBreadcrumbs([{ level: 1, label: data.kpiName }]);
    }
    onOpenChange(open);
  };

  const handleLevelClick = (level: number, category?: string) => {
    setCurrentLevel(level);
    if (category) {
      // Update selected categories array
      const newCategories = selectedCategories.slice(0, level - 2);
      newCategories.push(category);
      setSelectedCategories(newCategories);
      
      // Update breadcrumbs
      const newBreadcrumbs = [{ level: 1, label: data.kpiName }];
      for (let i = 0; i < newCategories.length; i++) {
        newBreadcrumbs.push({
          level: i + 2,
          label: getLevelLabel(i + 2),
          category: newCategories[i],
        });
      }
      setBreadcrumbs(newBreadcrumbs);
    } else {
      // Reset to level 1
      setSelectedCategories([]);
      setBreadcrumbs([{ level: 1, label: data.kpiName }]);
    }
  };

  const handleBack = () => {
    if (currentLevel > 1) {
      const newLevel = currentLevel - 1;
      setCurrentLevel(newLevel);
      const newCategories = selectedCategories.slice(0, newLevel - 1);
      setSelectedCategories(newCategories);
      
      const newBreadcrumbs = [{ level: 1, label: data.kpiName }];
      for (let i = 0; i < newCategories.length; i++) {
        newBreadcrumbs.push({
          level: i + 2,
          label: getLevelLabel(i + 2),
          category: newCategories[i],
        });
      }
      setBreadcrumbs(newBreadcrumbs);
    }
  };

  const handleBreadcrumbClick = (level: number) => {
    if (level === 1) {
      handleLevelClick(1);
    } else {
      const category = breadcrumbs.find((b) => b.level === level)?.category;
      if (category) {
        handleLevelClick(level, category);
      }
    }
  };

  const getLevelLabel = (level: number): string => {
    const labels: Record<number, string> = {
      1: "Overview",
      2: "Level 2 Breakdown",
      3: "Level 3 Breakdown",
      4: "Individual Items",
    };
    return labels[level] || `Level ${level}`;
  };

  const renderLevel1 = () => {
    if (!data.level1) return null;

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.level1.data.map((item, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                if (data.level1?.drillable) {
                  handleLevelClick(2, item.category);
                }
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{item.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {item.percentage !== undefined
                    ? `${item.percentage.toFixed(1)}%`
                    : item.value}
                </div>
                <CardDescription className="text-xs mt-1">
                  {item.count} / {item.total}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderLevel2 = () => {
    if (!data.level2) return null;

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.level2.data.map((item, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                if (data.level2?.drillable) {
                  handleLevelClick(3, item.category);
                }
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{item.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {item.percentage !== undefined
                    ? `${item.percentage.toFixed(1)}%`
                    : item.value}
                </div>
                <CardDescription className="text-xs mt-1">
                  {item.count} / {item.total}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderLevel3 = () => {
    if (!data.level3) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {data.level3.data.map((item, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">{item.stage}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Target: {item.target} days
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{item.days} days</div>
                    <Badge
                      variant={item.onTime ? "default" : "destructive"}
                      className="mt-1"
                    >
                      {item.onTime ? "On Time" : "Delayed"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {data.level3.drillable && (
          <Button
            onClick={() => handleLevelClick(4)}
            className="w-full"
            variant="outline"
          >
            View Individual Applications
            <ChevronRightIcon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  const renderLevel4 = () => {
    if (!data.level4) return null;

    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MA Number</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processing Days</TableHead>
                <TableHead>On Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.level4.data.map((app: IndividualApplication, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{app.maNumber}</TableCell>
                  <TableCell>{app.brandName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.status === "Approved"
                          ? "default"
                          : app.status === "Rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{app.processingDays}</TableCell>
                  <TableCell>
                    <Badge variant={app.onTime ? "default" : "destructive"}>
                      {app.onTime ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderCurrentLevel = () => {
    switch (currentLevel) {
      case 1:
        return renderLevel1();
      case 2:
        return renderLevel2();
      case 3:
        return renderLevel3();
      case 4:
        return renderLevel4();
      default:
        return renderLevel1();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data.kpiName}</DialogTitle>
          <DialogDescription>
            Current Value:{" "}
            {data.currentValue.percentage !== undefined
              ? `${data.currentValue.percentage.toFixed(1)}%`
              : data.currentValue.median !== undefined
              ? `${data.currentValue.median} days`
              : data.currentValue.average !== undefined
              ? `${data.currentValue.average.toFixed(1)} days`
              : data.currentValue.value}
            {" "}({data.currentValue.numerator} / {data.currentValue.denominator})
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLevelClick(1)}
            className="h-6 px-2"
          >
            <HomeIcon className="h-3 w-3" />
          </Button>
          {breadcrumbs.slice(1).map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <ChevronRightIcon className="h-3 w-3" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(crumb.level)}
                className="h-6 px-2 text-xs"
              >
                {crumb.category}
              </Button>
            </div>
          ))}
        </div>

        {/* Back Button */}
        {currentLevel > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="w-fit"
          >
            <ChevronLeftIcon className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}

        {/* Content */}
        <div className="mt-4">{renderCurrentLevel()}</div>

        {/* Export Button */}
        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

