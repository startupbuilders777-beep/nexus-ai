"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Database,
  FileText,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold">Welcome back, John!</h2>
        <p className="text-primary-foreground/80 mt-1">
          You&apos;ve processed 45,230 tokens this month. Keep building amazing AI apps!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value="1,234"
          change="+12%"
          icon={FileText}
        />
        <StatCard
          title="Data Sources"
          value="8"
          change="+2"
          icon={Database}
        />
        <StatCard
          title="Conversations"
          value="456"
          change="+8%"
          icon={MessageSquare}
        />
        <StatCard
          title="Tokens Used"
          value="45.2K"
          change="+23%"
          icon={Zap}
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Token Usage</CardTitle>
            <CardDescription>Your usage over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end gap-2">
              {[65, 45, 78, 52, 90, 68, 85].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary/80 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest data operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${activity.color}`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant={activity.status === "success" ? "success" : "secondary"}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Connect Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add a new data source to ingest documents.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Brain className="h-5 w-5 text-green-500" />
            </div>
            <CardTitle className="text-base">Start Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Query your data using AI-powered RAG.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <CardTitle className="text-base">Upload Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload PDF, DOCX, or text files.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Sources Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>Your connected data sources</CardDescription>
          </div>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${source.color}`}>
                    <source.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {source.documents} documents • {source.size}
                    </p>
                  </div>
                </div>
                <Badge variant={source.status === "connected" ? "success" : "warning"}>
                  {source.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center mt-1">
          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
          {change} from last month
        </p>
      </CardContent>
    </Card>
  );
}

const recentActivity = [
  {
    title: "Processed document 'Q4 Report.pdf'",
    time: "2 minutes ago",
    status: "success",
    icon: FileText,
    color: "bg-green-500/10",
  },
  {
    title: "Generated embeddings for 45 chunks",
    time: "5 minutes ago",
    status: "success",
    icon: Brain,
    color: "bg-purple-500/10",
  },
  {
    title: "Synced data from Google Drive",
    time: "1 hour ago",
    status: "success",
    icon: Database,
    color: "bg-blue-500/10",
  },
  {
    title: "New conversation started",
    time: "2 hours ago",
    status: "success",
    icon: MessageSquare,
    color: "bg-orange-500/10",
  },
];

const dataSources = [
  {
    id: "1",
    name: "Company Knowledge Base",
    type: "google-drive",
    documents: 234,
    size: "156 MB",
    status: "connected",
    icon: Database,
    color: "bg-blue-500/10",
  },
  {
    id: "2",
    name: "Product Documentation",
    type: "notion",
    documents: 89,
    size: "45 MB",
    status: "connected",
    icon: FileText,
    color: "bg-purple-500/10",
  },
  {
    id: "3",
    name: "Customer Support Tickets",
    type: "hubspot",
    documents: 567,
    size: "234 MB",
    status: "connected",
    icon: Users,
    color: "bg-orange-500/10",
  },
  {
    id: "4",
    name: "Salesforce CRM",
    type: "salesforce",
    documents: 1234,
    size: "567 MB",
    status: "syncing",
    icon: Database,
    color: "bg-green-500/10",
  },
];
