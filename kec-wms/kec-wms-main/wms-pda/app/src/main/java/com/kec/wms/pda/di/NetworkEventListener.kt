package com.kec.wms.pda.di

import android.util.Log
import okhttp3.Call
import okhttp3.Connection
import okhttp3.EventListener
import okhttp3.Handshake
import okhttp3.HttpUrl
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import java.io.IOException
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Proxy

/**
 * 网络事件监听器
 * 用于追踪OkHttp的详细执行过程
 */
class NetworkEventListener : EventListener() {

    override fun callStart(call: Call) {
        Log.d("NetworkEvent", "=== 调用开始 ===")
        Log.d("NetworkEvent", "URL: ${call.request().url}")
    }

    override fun dnsStart(call: Call, domainName: String) {
        Log.d("NetworkEvent", "DNS解析开始: $domainName")
    }

    override fun dnsEnd(call: Call, domainName: String, inetAddressList: List<InetAddress>) {
        Log.d("NetworkEvent", "DNS解析完成: $domainName -> ${inetAddressList.joinToString()}")
    }

    override fun connectStart(call: Call, inetSocketAddress: InetSocketAddress, proxy: Proxy) {
        Log.d("NetworkEvent", "连接开始: $inetSocketAddress, proxy: $proxy")
    }

    override fun secureConnectStart(call: Call) {
        Log.d("NetworkEvent", "SSL握手开始")
    }

    override fun secureConnectEnd(call: Call, handshake: Handshake?) {
        Log.d("NetworkEvent", "SSL握手完成: ${handshake?.tlsVersion}")
    }

    override fun connectEnd(call: Call, inetSocketAddress: InetSocketAddress, proxy: Proxy, protocol: Protocol?) {
        Log.d("NetworkEvent", "连接完成: protocol=$protocol")
    }

    override fun connectFailed(call: Call, inetSocketAddress: InetSocketAddress, proxy: Proxy, protocol: Protocol?, ioe: IOException) {
        Log.e("NetworkEvent", "连接失败: $inetSocketAddress", ioe)
    }

    override fun requestHeadersStart(call: Call) {
        Log.d("NetworkEvent", "发送请求头开始")
    }

    override fun requestHeadersEnd(call: Call, request: Request) {
        Log.d("NetworkEvent", "发送请求头完成")
    }

    override fun requestBodyStart(call: Call) {
        Log.d("NetworkEvent", "发送请求体开始")
    }

    override fun requestBodyEnd(call: Call, byteCount: Long) {
        Log.d("NetworkEvent", "发送请求体完成: $byteCount bytes")
    }

    override fun responseHeadersStart(call: Call) {
        Log.d("NetworkEvent", "接收响应头开始")
    }

    override fun responseHeadersEnd(call: Call, response: Response) {
        Log.d("NetworkEvent", "接收响应头完成: ${response.code}")
    }

    override fun responseBodyStart(call: Call) {
        Log.d("NetworkEvent", "接收响应体开始")
    }

    override fun responseBodyEnd(call: Call, byteCount: Long) {
        Log.d("NetworkEvent", "接收响应体完成: $byteCount bytes")
    }

    override fun callEnd(call: Call) {
        Log.d("NetworkEvent", "=== 调用结束 ===")
    }

    override fun callFailed(call: Call, ioe: IOException) {
        Log.e("NetworkEvent", "=== 调用失败 ===", ioe)
    }

    override fun canceled(call: Call) {
        Log.w("NetworkEvent", "=== 调用被取消 ===")
    }
}
