package com.kec.wms.pda.di

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 调试拦截器
 * 用于追踪网络请求的执行流程
 */
@Singleton
class DebugInterceptor @Inject constructor() : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        Log.d("DebugInterceptor", "=== 请求开始 ===")
        Log.d("DebugInterceptor", "URL: ${request.url}")
        Log.d("DebugInterceptor", "Host: ${request.url.host}")
        Log.d("DebugInterceptor", "Port: ${request.url.port}")
        Log.d("DebugInterceptor", "Method: ${request.method}")
        Log.d("DebugInterceptor", "Headers: ${request.headers}")
        Log.d("DebugInterceptor", "线程: ${Thread.currentThread().name}")

        try {
            Log.d("DebugInterceptor", "准备执行请求...")
            val startTime = System.currentTimeMillis()

            val response = chain.proceed(request)

            val duration = System.currentTimeMillis() - startTime
            Log.d("DebugInterceptor", "请求完成，耗时: ${duration}ms")
            Log.d("DebugInterceptor", "状态码: ${response.code}")
            Log.d("DebugInterceptor", "响应头: ${response.headers}")

            return response
        } catch (e: Exception) {
            Log.e("DebugInterceptor", "请求异常: ${e.javaClass.simpleName}", e)
            Log.e("DebugInterceptor", "异常消息: ${e.message}")
            Log.e("DebugInterceptor", "异常堆栈:", e)
            throw e
        }
    }
}
