import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// 템플릿별 견적 통계 차트
export const TemplateStatsChart = ({ data }: { data: any[] }) => {
  const colors = ["#4F46E5", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>템플릿별 견적 수</CardTitle>
        <CardDescription>각 템플릿별로 등록된 견적의 수</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="templateName" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#4F46E5">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 날짜별 견적 추이 차트
export const QuoteTrendChart = ({ data }: { data: any[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>견적 등록 추이</CardTitle>
        <CardDescription>기간별 견적 등록 건수 추이</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#4F46E5"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 필드 분포 파이 차트
export const FieldDistributionChart = ({ 
  data, 
  title, 
  subTitle 
}: { 
  data: any[]; 
  title: string;
  subTitle: string;
}) => {
  const colors = ["#4F46E5", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"];
  
  // 데이터가 너무 많으면 상위 7개만 표시하고 나머지는 "기타"로 묶음
  const MAX_SEGMENTS = 7;
  let processedData = [...data];
  
  if (data.length > MAX_SEGMENTS) {
    const topData = data.slice(0, MAX_SEGMENTS - 1);
    const otherData = data.slice(MAX_SEGMENTS - 1);
    const otherCount = otherData.reduce((sum, item) => sum + item.count, 0);
    
    processedData = [
      ...topData,
      { value: "기타", count: otherCount }
    ];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subTitle}</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={processedData}
              dataKey="count"
              nameKey="value"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 통계 요약 카드
export const StatsSummaryCard = ({ 
  title, 
  value, 
  description, 
  trend,
  trendValue 
}: { 
  title: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) => {
  const trendColor = 
    trend === "up" ? "text-green-500" : 
    trend === "down" ? "text-red-500" : 
    "text-gray-500";

  const trendIcon = 
    trend === "up" ? "↑" : 
    trend === "down" ? "↓" : 
    "→";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {trend && trendValue && (
          <div className="flex items-center mt-1">
            <span className={`${trendColor} text-xs font-medium flex items-center`}>
              {trendIcon} {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
