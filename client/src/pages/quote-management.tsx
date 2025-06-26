import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateManagement from "@/components/template-management";
import QuoteUpload from "@/components/quote-upload";
import DataManagement from "@/components/data-management";
import DataAnalysis from "@/components/data-analysis";
import { Button } from "@/components/ui/button";

export default function QuoteManagement() {
  const [activeTab, setActiveTab] = useState("template");

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-300 px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black">견적서 관리 시스템</h1>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="text-xs">
              설정
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              도움말
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-white border-b border-gray-300 rounded-none h-auto p-0 justify-start">
          <TabsTrigger
            value="template"
            className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black data-[state=active]:bg-white text-gray-600 hover:text-black hover:border-gray-300 rounded-none"
          >
            설정 및 템플릿 관리
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black data-[state=active]:bg-white text-gray-600 hover:text-black hover:border-gray-300 rounded-none"
          >
            견적서 업로드 및 매핑
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black data-[state=active]:bg-white text-gray-600 hover:text-black hover:border-gray-300 rounded-none"
          >
            견적 데이터 관리
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black data-[state=active]:bg-white text-gray-600 hover:text-black hover:border-gray-300 rounded-none"
          >
            데이터 분석 및 보고서
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="template" className="tab-content p-6 overflow-auto m-0">
            <TemplateManagement />
          </TabsContent>

          <TabsContent value="upload" className="tab-content p-6 overflow-auto m-0">
            <QuoteUpload />
          </TabsContent>

          <TabsContent value="data" className="tab-content p-6 overflow-auto m-0">
            <DataManagement />
          </TabsContent>

          <TabsContent value="analysis" className="tab-content p-6 overflow-auto m-0">
            <DataAnalysis />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
