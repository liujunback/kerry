package com.kec.wms.pda.data.api

import org.json.JSONObject
import java.nio.charset.StandardCharsets
import retrofit2.HttpException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

fun Throwable.toApiException(defaultMessage: String = "请求失败"): Exception {
    return when (this) {
        is UnknownHostException -> Exception("无法连接到服务器，请检查网络连接")
        is SocketTimeoutException -> Exception("网络请求超时，请稍后重试")
        is HttpException -> Exception(normalizeOperatorMessage(parseHttpErrorMessage() ?: defaultMessage))
        else -> Exception(normalizeOperatorMessage(message ?: defaultMessage))
    }
}

private fun HttpException.parseHttpErrorMessage(): String? {
    val bodyBytes = response()?.errorBody()?.bytes()
    val body = bodyBytes?.let(::decodeErrorBody).orEmpty().trim()
    if (body.isEmpty()) {
        return message()
    }

    return try {
        val json = JSONObject(body)
        json.optString("message").takeIf { it.isNotBlank() }
            ?: json.optString("error").takeIf { it.isNotBlank() }
            ?: json.optString("code").takeIf { it.isNotBlank() }
            ?: message()
    } catch (_: Exception) {
        body
    }
}

private fun decodeErrorBody(bytes: ByteArray): String {
    if (bytes.isEmpty()) return ""

    val utf8Text = String(bytes, StandardCharsets.UTF_8)
    return if (utf8Text.contains('\uFFFD')) {
        String(bytes, Charsets.ISO_8859_1)
    } else {
        utf8Text
    }
}

private fun normalizeOperatorMessage(message: String): String {
    val normalized = message.trim()
    return when {
        normalized.contains("Unable to start a transaction", ignoreCase = true) ->
            "当前操作较多，请稍后重试"
        normalized.contains("Transaction API error", ignoreCase = true) ->
            "当前操作较多，请稍后重试"
        else -> normalized
    }
}
