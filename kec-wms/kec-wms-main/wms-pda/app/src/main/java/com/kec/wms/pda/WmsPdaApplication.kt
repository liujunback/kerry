package com.kec.wms.pda

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * WMS PDA应用程序类
 * 使用Hilt进行依赖注入
 */
@HiltAndroidApp
class WmsPdaApplication : Application() {

    override fun onCreate() {
        super.onCreate()
    }
}
