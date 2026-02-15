"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  FileText,
  Globe,
  Link2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Cloud,
} from "lucide-react";

export default function DataSourcesPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Sources</h2>
          <p className="text-muted-foreground">Connect and manage your data sources</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Connect Data Source</DialogTitle>
              <DialogDescription>
                Choose a data source to connect. You can upload files or connect to external services.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload">File Upload</TabsTrigger>
                  <TabsTrigger value="cloud">Cloud Storage</TabsTrigger>
                  <TabsTrigger value="api">API / Database</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-4 mt-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Drop files here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, PPTX, TXT, MD up to 100MB
                    </p>
                    <Button variant="outline" className="mt-4">
                      Browse Files
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="cloud" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {cloudSources.map((source) => (
                      <Button
                        key={source.name}
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                      >
                        <source.icon className="h-6 w-6" />
                        <span className="text-xs">{source.name}</span>
                      </Button>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="api" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {apiSources.map((source) => (
                      <Button
                        key={source.name}
                        variant="outline"
                        className="h-20 flex flex-col gap-2"
                      >
                        <source.icon className="h-6 w-6" />
                        <span className="text-xs">{source.name}</span>
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search data sources..." className="pl-9" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">All Types</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>All Types</DropdownMenuItem>
            <DropdownMenuItem>File Upload</DropdownMenuItem>
            <DropdownMenuItem>Google Drive</DropdownMenuItem>
            <DropdownMenuItem>Dropbox</DropdownMenuItem>
            <DropdownMenuItem>Notion</DropdownMenuItem>
            <DropdownMenuItem>Database</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">All Status</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>All Status</DropdownMenuItem>
            <DropdownMenuItem>Connected</DropdownMenuItem>
            <DropdownMenuItem>Syncing</DropdownMenuItem>
            <DropdownMenuItem>Error</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dataSources.map((source) => (
          <Card key={source.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${source.color}`}>
                  <source.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{source.name}</CardTitle>
                  <CardDescription className="text-xs">{source.type}</CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link2 className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {source.documents} documents
                </span>
                <Badge variant={source.status === "connected" ? "success" : "warning"}>
                  {source.status}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Last synced: {source.lastSync}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const cloudSources = [
  { name: "Google Drive", icon: Cloud },
  { name: "Dropbox", icon: Database },
  { name: "OneDrive", icon: Cloud },
  { name: "S3", icon: Database },
];

const apiSources = [
  { name: "PostgreSQL", icon: Database },
  { name: "MongoDB", icon: Database },
  { name: "REST API", icon: Link2 },
  { name: "GraphQL", icon: Link2 },
];

const dataSources = [
  {
    id: "1",
    name: "Company Knowledge Base",
    type: "Google Drive",
    documents: 234,
    status: "connected",
    lastSync: "2 minutes ago",
    icon: Database,
    color: "bg-blue-500/10",
  },
  {
    id: "2",
    name: "Product Documentation",
    type: "Notion",
    documents: 89,
    status: "connected",
    lastSync: "1 hour ago",
    icon: FileText,
    color: "bg-purple-500/10",
  },
  {
    id: "3",
    name: "Customer Support",
    type: "HubSpot",
    documents: 567,
    status: "connected",
    lastSync: "3 hours ago",
    icon: Database,
    color: "bg-orange-500/10",
  },
  {
    id: "4",
    name: "Website Content",
    type: "Web Scraper",
    documents: 123,
    status: "syncing",
    lastSync: "In progress",
    icon: Globe,
    color: "bg-green-500/10",
  },
  {
    id: "5",
    name: "Sales Documents",
    type: "File Upload",
    documents: 45,
    status: "connected",
    lastSync: "1 day ago",
    icon: Upload,
    color: "bg-yellow-500/10",
  },
  {
    id: "6",
    name: "Internal Wiki",
    type: "Confluence",
    documents: 312,
    status: "error",
    lastSync: "2 days ago",
    icon: FileText,
    color: "bg-red-500/10",
  },
];
