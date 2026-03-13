## OpenClaw RAG 服務模組 (openclaw_rag_service) 設計

本設計旨在提供一個結構清晰、功能分離的 RAG（Retrieval-Augmented Generation）服務模組，專為與 Ollama 進行互動而優化。

### 一、 模組檔案結構

清晰的檔案結構有助於維護和擴展。每個檔案都承擔單一的職責。

``
openclaw_rag_service/
├── __init__.py           # 模組初始化檔案，用於暴露主要介面
├── config.py             # 存放所有設定，如模型名稱、資料庫路徑、提示詞模板等
├── embedding.py          # 負責將文字轉換為向量嵌入
├── retrieval.py          # 負責從向量資料庫中檢索相關文件
├── prompting.py          # 負責根據查詢和檢索到的上下文建構提示詞
├── llm.py                # 負責與 Ollama LLM API 互動，特別是串流生成
├── rag_chain.py          # 核心協調器，將所有組件串連起來形成完整的 RAG 工作流
├── exceptions.py         # 定義模組專用的自訂異常
└── models.py             # 定義資料結構（Pydantic 或 dataclasses），確保資料流的一致性
`

### 二、 核心組件程式碼框架

以下為每個檔案的程式碼骨架，僅包含類別和函數簽名，以展示其職責和介面。

#### 1. config.py

存放可配置的參數，使其與業務邏輯分離。

`python
# openclaw_rag_service/config.py

# Embedding Model Configuration
EMBEDDING_MODEL_NAME = "nomic-embed-text"
OLLAMA_BASE_URL = "http://localhost:11434"

# Vector Store Configuration
VECTOR_DB_PATH = "./chroma_db"
COLLECTION_NAME = "openclaw_docs"
TOP_K_RESULTS = 3  # 檢索最相關的 K 個文件

# LLM Configuration
LLM_MODEL_NAME = "llama3"

# Prompt Template
PROMPT_TEMPLATE = """
基於以下已知資訊，簡潔、專業地回答用戶的問題。
如果資訊不足，請直接說「根據我所掌握的資訊，無法回答這個問題」，不要嘗試編造答案。

已知資訊：
{context}

用戶問題：
{question}
"""
`

#### 2. exceptions.py

定義自訂異常，讓錯誤處理更具體、更清晰。

`python
# openclaw_rag_service/exceptions.py

class RagServiceError(Exception):
    """RAG 服務的基礎異常類別。"""
    pass

class OllamaConnectionError(RagServiceError):
    """無法連接到 Ollama 服務時引發。"""
    pass

class VectorDBError(RagServiceError):
    """向量資料庫操作失敗時引發。"""
    pass

class EmbeddingError(RagServiceError):
    """文字嵌入失敗時引發。"""
    pass
`

#### 3. models.py

使用 dataclasses 或 Pydantic 定義清晰的資料模型。

`python
# openclaw_rag_service/models.py

from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Document:
    """表示一個從知識庫中檢索到的文件。"""
    content: str
    metadata: Optional[dict] = None

@dataclass
class RagResponse:
    """表示 RAG 服務的最終回應。"""
    answer: str
    sources: List[Document]
    is_rag_generated: bool = True # 是否基於檢索到的上下文生成
`

#### 4. embedding.py

負責處理文字到向量的轉換。

`python
# openclaw_rag_service/embedding.py

import ollama
from .config import OLLAMA_BASE_URL, EMBEDDING_MODEL_NAME
from .exceptions import EmbeddingError, OllamaConnectionError

class EmbeddingService:
    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME, base_url: str = OLLAMA_BASE_URL):
        self.client = ollama.Client(host=base_url)
        self.model_name = model_name

    def get_embedding(self, text: str) -> List[float]:
        """將給定的文字轉換為向量嵌入。"""
        try:
            # 這裡可能需要根據實際的 Ollama 嵌入 API 調整調用方式
            # 假設 ollama.Client 有一個 embed 方法
            # 或者使用 ollama.generate 並提取嵌入
            response = self.client.embeddings(model=self.model_name, prompt=text)
            return response['embedding']
        except ollama.ResponseError as e:
            raise EmbeddingError(f"Ollama 嵌入模型 {self.model_name} 錯誤: {e}") from e
        except Exception as e:
            raise OllamaConnectionError(f"無法連接或調用 Ollama 嵌入服務: {e}") from e

`

#### 5. retrieval.py

負責與向量資料庫（例如 ChromaDB）互動，檢索相關文件。

`python
# openclaw_rag_service/retrieval.py

# 假設我們使用 ChromaDB 作為向量資料庫
# from chromadb import Client, Settings
# from chromadb.utils import embedding_functions

from typing import List
from .config import VECTOR_DB_PATH, COLLECTION_NAME, TOP_K_RESULTS
from .models import Document
from .exceptions import VectorDBError

class RetrievalService:
    def __init__(self, db_path: str = VECTOR_DB_PATH, collection_name: str = COLLECTION_NAME):
        # 這裡會初始化 ChromaDB 客戶端和集合
        # self.client = Client(Settings(persist_directory=db_path))
        # self.collection = self.client.get_or_create_collection(
        #     name=collection_name,
        #     embedding_function=embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2") # 這裡需要與 EmbeddingService 保持一致
        # )
        pass # 暫時不實作具體資料庫連接邏輯

    def retrieve_documents(self, query_embedding: List[float], top_k: int = TOP_K_RESULTS) -> List[Document]:
        """根據查詢嵌入從向量資料庫中檢索最相關的文件。"""
        try:
            # 模擬檢索結果
            # results = self.collection.query(query_embeddings=[query_embedding], n_results=top_k)
            # 將結果轉換為 Document 物件
            # return [Document(content=res['document'], metadata=res['metadata']) for res in results]
            return [Document(content=f"這是與查詢相關的模擬文件內容 {i+1}", metadata={"source": f"doc_{i+1}.md"}) for i in range(top_k)]
        except Exception as e:
            raise VectorDBError(f"向量資料庫檢索失敗: {e}") from e

`

#### 6. prompting.py

負責將所有輸入整合成最終發送給 LLM 的提示詞。

`python
# openclaw_rag_service/prompting.py

from typing import List
from .config import PROMPT_TEMPLATE
from .models import Document

class PromptService:
    def build_prompt(self, query: str, context_documents: List[Document]) -> str:
        """根據使用者查詢和檢索到的上下文建構最終提示詞。"""
        context_str = "\n\n".join([doc.content for doc in context_documents])
        
        # 如果沒有檢索到上下文，也可以提供一個備用提示詞
        if not context_str:
            # 或者根據業務邏輯，直接返回一個不帶 RAG 的提示詞
            return f"請回答以下問題：\n{query}"
            
        return PROMPT_TEMPLATE.format(context=context_str, question=query)

`

#### 7. llm.py

處理與 Ollama LLM 的互動，特別是串流輸出。

`python
# openclaw_rag_service/llm.py

import ollama
from typing import Iterator
from .config import OLLAMA_BASE_URL, LLM_MODEL_NAME
from .exceptions import OllamaConnectionError, RagServiceError

class LLMService:
    def __init__(self, model_name: str = LLM_MODEL_NAME, base_url: str = OLLAMA_BASE_URL):
        self.client = ollama.Client(host=base_url)
        self.model_name = model_name

    def generate_stream(self, prompt: str) -> Iterator[str]:
        """以串流方式從 Ollama LLM 生成回應。"""
        try:
            response_stream = self.client.chat(
                model=self.model_name,
                messages=[
                    {'role': 'user', 'content': prompt}
                ],
                stream=True
            )
            for chunk in response_stream:
                content = chunk['message']['content']
                if content:
                    yield content
        except ollama.ResponseError as e:
            raise RagServiceError(f"Ollama LLM 模型 {self.model_name} 回應錯誤: {e}") from e
        except Exception as e:
            raise OllamaConnectionError(f"無法連接或調用 Ollama LLM 服務: {e}") from e

`

#### 8. rag_chain.py

將上述所有服務協調起來，形成完整的 RAG 流程。

`python
# openclaw_rag_service/rag_chain.py

from typing import Iterator
from .embedding import EmbeddingService
from .retrieval import RetrievalService
from .prompting import PromptService
from .llm import LLMService
from .models import RagResponse, Document
from .exceptions import RagServiceError, OllamaConnectionError, VectorDBError, EmbeddingError

class RagChain:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.retrieval_service = RetrievalService() # 這裡需要傳入正確的嵌入服務，以便 ChromaDB 使用
        self.prompt_service = PromptService()
        self.llm_service = LLMService()

    def stream_answer(self, query: str) -> Iterator[str]:
        """執行完整的 RAG 流程並以串流方式返回答案。"""
        try:
            # 1. 查詢嵌入
            query_embedding = self.embedding_service.get_embedding(query)

            # 2. 檢索相關文件
            context_documents = self.retrieval_service.retrieve_documents(query_embedding)
            
            # 3. 建構提示詞
            final_prompt = self.prompt_service.build_prompt(query, context_documents)

            # 4. 調用 LLM 並串流回應
            yield from self.llm_service.generate_stream(final_prompt)
            
        except EmbeddingError as e:
            print(f"[ERROR] 嵌入失敗: {e}")
            yield "抱歉，在處理您的查詢時，嵌入服務發生錯誤。請稍後再試。"
        except VectorDBError as e:
            print(f"[ERROR] 向量資料庫錯誤: {e}")
            yield "抱歉，在檢索知識庫時發生錯誤。請稍後再試。"
        except OllamaConnectionError as e:
            print(f"[ERROR] Ollama 連接錯誤: {e}")
            yield "抱歉，無法連接到語言模型。請檢查 Ollama 服務是否運行。"
        except RagServiceError as e:
            print(f"[ERROR] RAG 服務錯誤: {e}")
            yield "抱歉，RAG 服務發生未知錯誤。請聯繫開發者。"
        except Exception as e:
            print(f"[CRITICAL ERROR] 未預期的 RAG 錯誤: {e}")
            yield "抱歉，系統發生嚴重錯誤。我們正在努力修復中。"

    def get_answer(self, query: str) -> RagResponse:
        """執行完整的 RAG 流程並返回完整答案。"""
        full_answer_content = "".join(list(self.stream_answer(query)))
        
        # 這裡需要重新檢索一次文件，或者從 stream_answer 中獲取
        # 為了簡化，先假設這裡能拿到 context_documents
        query_embedding = self.embedding_service.get_embedding(query) # 重新獲取嵌入
        context_documents = self.retrieval_service.retrieve_documents(query_embedding)

        return RagResponse(
            answer=full_answer_content,
            sources=context_documents,
            is_rag_generated=bool(context_documents)
        )

``