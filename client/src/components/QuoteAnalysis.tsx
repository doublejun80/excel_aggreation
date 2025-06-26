import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { exportToExcel } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  TemplateStatsChart, 
  QuoteTrendChart, 
  FieldDistributionChart,
  StatsSummaryCard
} from "./charts/QuoteCharts";

// API 응답 타입 정의
interface SummaryData {
  quoteCount: number;
  templateCount: number;
  fileCount: number;
  latestQuoteDate: string | null;
}

interface TemplateStat {
  templateId: number;
  templateName: string;
  count: number;
}

interface DateStat {
  date: string;
  count: number;
}

interface FieldDistItem {
  value: string;
  count: number;
}

interface Template {
  id: number;
  name: string;
  [key: string]: any;
}

export default function QuoteAnalysis() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [periodType, setPeriodType] = useState("day");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<string>(""); 
  const { toast } = useToast();

  // 통계 요약 정보 조회
  const { data: summaryData, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ["/api/analytics/summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/summary");
      return res.json();
    }
  });

  // 템플릿별 통계 조회
  const { data: templateStats, isLoading: templateStatsLoading } = useQuery<TemplateStat[]>({
    queryKey: ["/api/analytics/by-template"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/by-template");
      return res.json();
    }
  });

  // 날짜별 통계 조회
  const { data: dateStats, isLoading: dateStatsLoading } = useQuery<DateStat[]>({
    queryKey: ["/api/analytics/by-date", periodType, dateRange],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/analytics/by-date?period=${periodType}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      return res.json();
    }
  });

  // 템플릿 목록 조회
  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/templates");
      return res.json();
    }
  });

  // 필드 분포 분석 
  const { data: fieldDistribution, isLoading: fieldDistLoading, refetch: refetchFieldDist } = useQuery<FieldDistItem[]>({
    queryKey: ["/api/analytics/field-distribution", selectedTemplateId, selectedField],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/analytics/field-distribution", {
        field: selectedField,
        templateId: selectedTemplateId,
      });
      return res.json();
    },
    enabled: !!selectedField // 필드가 선택되었을 때만 쿼리 실행
  });

  // 템플릿 변경 시 필드 분석 재요청
  useEffect(() => {
    if (selectedField) {
      refetchFieldDist();
    }
  }, [selectedTemplateId, selectedField, refetchFieldDist]);

  // 데이터 내보내기 함수
  const handleExportData = () => {
    if (!templateStats || !dateStats) return;

    // 템플릿 통계 데이터
    const templateExportData = templateStats.map((stat: TemplateStat) => ({
      '템플릿 ID': stat.templateId,
      '템플릿 이름': stat.templateName,
      '견적 수': stat.count
    }));

    // 날짜별 통계 데이터
    const dateExportData = dateStats.map((stat: DateStat) => ({
      '날짜': stat.date,
      '견적 수': stat.count
    }));

    // 필드 분포 데이터
    const fieldExportData = fieldDistribution ? fieldDistribution.map((item: FieldDistItem) => ({
      '값': item.value,
      '개수': item.count
    })) : [];

    // 여러 시트로 구성된 엑셀 파일 생성
    exportToExcel(
      {
        '템플릿별 통계': templateExportData,
        '날짜별 통계': dateExportData,
        '필드 분포 분석': fieldExportData
      },
      `견적_분석_보고서_${format(new Date(), "yyyyMMdd")}`
    );

    toast({
      title: "내보내기 완료",
      description: "분석 데이터를 성공적으로 내보냈습니다.",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">견적 데이터 분석</h2>
        <Button onClick={handleExportData}>분석 데이터 내보내기</Button>
      </div>

      {summaryLoading ? (
        <div className="flex justify-center py-10">데이터 로딩 중...</div>
      ) : (
        <>
          {/* 통계 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsSummaryCard
              title="총 견적 수"
              value={summaryData?.quoteCount || 0}
              description="모든 등록된 견적의 수"
            />
            <StatsSummaryCard
              title="템플릿 수"
              value={summaryData?.templateCount || 0}
              description="사용 중인 템플릿 수"
            />
            <StatsSummaryCard
              title="파일 수"
              value={summaryData?.fileCount || 0}
              description="업로드된 파일의 수"
            />
            <StatsSummaryCard
              title="최근 견적 등록"
              value={summaryData?.latestQuoteDate 
                ? format(new Date(summaryData.latestQuoteDate), "yyyy-MM-dd") 
                : "없음"}
              description="마지막으로 등록된 견적의 날짜"
            />
          </div>

          <Tabs defaultValue="trend">
            <TabsList className="mb-4">
              <TabsTrigger value="trend">추이 분석</TabsTrigger>
              <TabsTrigger value="template">템플릿 분석</TabsTrigger>
              <TabsTrigger value="field">필드 분석</TabsTrigger>
            </TabsList>

            {/* 추이 분석 탭 */}
            <TabsContent value="trend">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>견적 등록 추이 분석</CardTitle>
                  <CardDescription>기간별 견적 등록 건수</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label htmlFor="period-type">기간 단위</Label>
                      <Select 
                        value={periodType}
                        onValueChange={setPeriodType}
                      >
                        <SelectTrigger id="period-type">
                          <SelectValue placeholder="기간 단위 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">일별</SelectItem>
                          <SelectItem value="week">주별</SelectItem>
                          <SelectItem value="month">월별</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="start-date">시작일</Label>
                      <Input 
                        id="start-date" 
                        type="date" 
                        value={dateRange.startDate} 
                        onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">종료일</Label>
                      <Input 
                        id="end-date" 
                        type="date" 
                        value={dateRange.endDate} 
                        onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {dateStatsLoading ? (
                    <div className="flex justify-center py-10">차트 데이터 로딩 중...</div>
                  ) : (
                    dateStats && dateStats.length > 0 ? (
                      <QuoteTrendChart data={dateStats} />
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        선택한 기간에 데이터가 없습니다.
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 템플릿 분석 탭 */}
            <TabsContent value="template">
              {templateStatsLoading ? (
                <div className="flex justify-center py-10">템플릿 데이터 로딩 중...</div>
              ) : (
                templateStats && templateStats.length > 0 ? (
                  <TemplateStatsChart data={templateStats} />
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    템플릿 데이터가 없습니다.
                  </div>
                )
              )}
            </TabsContent>

            {/* 필드 분석 탭 */}
            <TabsContent value="field">
              <Card>
                <CardHeader>
                  <CardTitle>필드 분포 분석</CardTitle>
                  <CardDescription>특정 필드 값의 분포 분석</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <Label htmlFor="template-select">템플릿</Label>
                      <Select 
                        value={selectedTemplateId?.toString() || ""}
                        onValueChange={(value) => setSelectedTemplateId(value ? parseInt(value) : null)}
                      >
                        <SelectTrigger id="template-select">
                          <SelectValue placeholder="템플릿 선택 (옵션)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">모든 템플릿</SelectItem>
                          {templates.map((template: any) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="field-select">분석할 필드</Label>
                      <Input 
                        id="field-select"
                        placeholder="예: customer.name, price, product.type"
                        value={selectedField}
                        onChange={(e) => setSelectedField(e.target.value)}
                      />
                    </div>
                  </div>

                  {fieldDistLoading ? (
                    <div className="flex justify-center py-10">필드 데이터 로딩 중...</div>
                  ) : fieldDistribution && fieldDistribution.length > 0 ? (
                    <FieldDistributionChart 
                      data={fieldDistribution}
                      title={`${selectedField} 필드 분포`}
                      subTitle={`${selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.name + ' 템플릿의 ' : '모든 템플릿의 '}${selectedField} 필드 값 분포`}
                    />
                  ) : (
                    selectedField ? (
                      <div className="text-center py-10 text-muted-foreground">
                        해당 필드에 대한 데이터가 없거나 찾을 수 없습니다.
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        분석할 필드를 입력하세요.
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
