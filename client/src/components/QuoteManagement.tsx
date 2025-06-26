import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, exportToExcel } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// 견적 데이터의 타입 정의
interface Quote {
  id: number;
  fileId: number;
  templateId: number;
  data: any; // JSON 데이터를 저장
  createdAt: string;
  updatedAt: string | null;
  template?: {
    id: number;
    name: string;
  };
  file?: {
    id: number;
    filename: string;
  };
}

// 페이지네이션 타입 정의
interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// 검색 필터 타입 정의
interface SearchFilters {
  keyword: string;
  templateId: number | null;
  startDate: string;
  endDate: string;
}

export default function QuoteManagement() {
  // 상태 관리
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
    templateId: null,
    startDate: "",
    endDate: "",
  });
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 견적 데이터 조회 쿼리
  const {
    data: quotesData,
    isLoading,
    error,
    refetch,
  } = useQuery<{ data: Quote[]; pagination: Pagination }>({
    queryKey: ["/api/quotes", pagination.page, pagination.limit],
    queryFn: () => 
      apiRequest("GET", `/api/quotes?page=${pagination.page}&limit=${pagination.limit}`),
    enabled: true,
  });

  // 템플릿 목록 조회 쿼리
  const { data: templates = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/templates"],
    queryFn: () => apiRequest("GET", "/api/templates"),
    enabled: true,
  });

  // 견적 삭제 뮤테이션
  const deleteQuoteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "견적 삭제 완료",
        description: "선택한 견적이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "견적 삭제 실패",
        description: "견적을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 검색 수행 함수
  const handleSearch = async () => {
    try {
      const result = await apiRequest("POST", "/api/quotes/search", filters);
      queryClient.setQueryData(["/api/quotes", pagination.page, pagination.limit], {
        data: result,
        pagination: {
          ...pagination,
          totalCount: result.length,
          totalPages: Math.ceil(result.length / pagination.limit),
        },
      });
    } catch (error) {
      toast({
        title: "검색 실패",
        description: "견적을 검색하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 검색 필터 초기화
  const resetFilters = () => {
    setFilters({
      keyword: "",
      templateId: null,
      startDate: "",
      endDate: "",
    });
    refetch();
  };

  // 데이터 내보내기 (Excel)
  const handleExportToExcel = () => {
    if (!quotesData?.data) return;
    
    // 견적 데이터를 Excel 내보내기에 맞게 가공
    const exportData = quotesData.data.map(quote => {
      const data = quote.data || {};
      return {
        ID: quote.id,
        파일명: quote.file?.filename || "",
        템플릿: quote.template?.name || "",
        생성일자: quote.createdAt ? format(new Date(quote.createdAt), "yyyy-MM-dd") : "",
        ...Object.entries(data).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>),
      };
    });
    
    exportToExcel(exportData, `견적_데이터_${format(new Date(), "yyyyMMdd")}`);
  };

  // 견적 상세 정보 보기
  const handleViewQuoteDetail = async (id: number) => {
    try {
      const quote = await apiRequest("GET", `/api/quotes/${id}`);
      setSelectedQuote(quote);
    } catch (error) {
      toast({
        title: "견적 조회 실패",
        description: "견적 상세 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 견적 삭제
  const handleDeleteQuote = (id: number) => {
    if (window.confirm("정말 이 견적을 삭제하시겠습니까?")) {
      deleteQuoteMutation.mutate(id);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">견적 데이터 관리</h2>
        <div className="flex gap-2">
          <Button onClick={handleExportToExcel} variant="outline">
            Excel 내보내기
          </Button>
        </div>
      </div>

      {/* 검색 필터 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>검색 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">키워드 검색</Label>
              <Input
                id="keyword"
                placeholder="검색어 입력..."
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateId">템플릿</Label>
              <Select
                value={filters.templateId?.toString() || ""}
                onValueChange={(value) =>
                  setFilters({ ...filters, templateId: value ? parseInt(value) : null })
                }
              >
                <SelectTrigger id="templateId">
                  <SelectValue placeholder="템플릿 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetFilters}>
            초기화
          </Button>
          <Button onClick={handleSearch}>검색</Button>
        </CardFooter>
      </Card>

      {/* 견적 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>견적 목록</CardTitle>
          <CardDescription>
            총 {quotesData?.pagination.totalCount || 0}개의 견적 데이터
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">데이터를 불러오는 중...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-4">
              데이터를 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>파일명</TableHead>
                      <TableHead>템플릿</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotesData?.data && quotesData.data.length > 0 ? (
                      quotesData.data.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell>{quote.id}</TableCell>
                          <TableCell>{quote.file?.filename}</TableCell>
                          <TableCell>{quote.template?.name}</TableCell>
                          <TableCell>
                            {quote.createdAt
                              ? format(new Date(quote.createdAt), "yyyy-MM-dd")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewQuoteDetail(quote.id)}
                              >
                                상세보기
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteQuote(quote.id)}
                              >
                                삭제
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          견적 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 페이지네이션 */}
              {quotesData?.pagination && quotesData.pagination.totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      이전
                    </Button>
                    {Array.from({ length: quotesData.pagination.totalPages }, (_, i) => (
                      <Button
                        key={i}
                        variant={i + 1 === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === quotesData.pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 견적 상세 정보 다이얼로그 */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        <DialogContent className="max-w-3xl max-h-screen overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>견적 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <>
              <div className="flex flex-col gap-2 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">ID:</span> {selectedQuote.id}
                  </div>
                  <div>
                    <span className="font-medium">생성일:</span>{" "}
                    {format(new Date(selectedQuote.createdAt), "yyyy-MM-dd HH:mm")}
                  </div>
                  <div>
                    <span className="font-medium">파일:</span> {selectedQuote.file?.filename}
                  </div>
                  <div>
                    <span className="font-medium">템플릿:</span> {selectedQuote.template?.name}
                  </div>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="text-md font-medium mb-2">견적 내용:</div>
              <ScrollArea className="h-96 border rounded-md p-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedQuote.data && Object.entries(selectedQuote.data).map(([key, value]) => (
                    <div key={key} className="border-b pb-2">
                      <div className="font-medium">{key}</div>
                      <div>{String(value)}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedQuote) {
                  handleDeleteQuote(selectedQuote.id);
                  setSelectedQuote(null);
                }
              }}
            >
              삭제
            </Button>
            <DialogClose asChild>
              <Button variant="outline">닫기</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
