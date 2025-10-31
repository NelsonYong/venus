import { getJson } from 'serpapi';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
  date?: string;
}

export interface SearchResponse {
  query: string;
  organic_results: SearchResult[];
  answer_box?: {
    answer?: string;
    snippet?: string;
    title?: string;
  };
  knowledge_graph?: {
    title?: string;
    description?: string;
    type?: string;
  };
  searchTime: number;
}

/**
 * 使用 SerpAPI 进行网络搜索
 * @param query 搜索查询
 * @param numResults 返回结果数量，默认 5
 * @returns 搜索结果
 */
export async function performWebSearch(
  query: string,
  numResults: number = 5
): Promise<SearchResponse> {
  const startTime = Date.now();

  if (!process.env.SERPAPI_API_KEY) {
    throw new Error('SERPAPI_API_KEY is not configured');
  }

  try {
    const results = await getJson({
      engine: "google",
      api_key: process.env.SERPAPI_API_KEY,
      q: query,
      num: numResults,
      gl: "cn", // 国家代码
      hl: "zh-cn", // 语言
    });

    const organicResults: SearchResult[] = (results.organic_results || []).map((result: any) => ({
      title: result.title || '',
      link: result.link || '',
      snippet: result.snippet || '',
      position: result.position,
      date: result.date,
    }));

    return {
      query,
      organic_results: organicResults,
      answer_box: results.answer_box,
      knowledge_graph: results.knowledge_graph,
      searchTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Web search error:', error);
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 格式化搜索结果为可读文本
 * @param searchResponse 搜索响应
 * @returns 格式化的文本
 */
export function formatSearchResults(searchResponse: SearchResponse): string {
  let formatted = `搜索词: ${searchResponse.query}\n\n`;

  // 添加答案框（如果有）
  if (searchResponse.answer_box?.answer) {
    formatted += `直接答案: ${searchResponse.answer_box.answer}\n\n`;
  }

  // 添加知识图谱（如果有）
  if (searchResponse.knowledge_graph?.description) {
    formatted += `知识图谱:\n${searchResponse.knowledge_graph.title || ''}\n${searchResponse.knowledge_graph.description}\n\n`;
  }

  // 添加搜索结果
  formatted += `搜索结果:\n`;
  searchResponse.organic_results.forEach((result, index) => {
    formatted += `${index + 1}. ${result.title}\n`;
    formatted += `   ${result.snippet}\n`;
    formatted += `   来源: ${result.link}\n\n`;
  });

  return formatted;
}
