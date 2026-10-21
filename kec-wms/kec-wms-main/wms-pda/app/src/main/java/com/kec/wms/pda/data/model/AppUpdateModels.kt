package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class AppUpdateInfo(
    @SerializedName("versionCode")
    val versionCode: Int,

    @SerializedName("versionName")
    val versionName: String,

    @SerializedName("minSupportedVersionCode")
    val minSupportedVersionCode: Int,

    @SerializedName("forceUpdate")
    val forceUpdate: Boolean,

    @SerializedName("downloadUrl")
    val downloadUrl: String,

    @SerializedName("releaseNotes")
    val releaseNotes: List<String>,

    @SerializedName("fileSize")
    val fileSize: Long,

    @SerializedName("fileSha256")
    val fileSha256: String,

    @SerializedName("publishedAt")
    val publishedAt: String
)

enum class AppUpdateRequirement {
    NONE,
    OPTIONAL,
    FORCED
}

data class AppUpdateEvaluation(
    val info: AppUpdateInfo,
    val requirement: AppUpdateRequirement
)
