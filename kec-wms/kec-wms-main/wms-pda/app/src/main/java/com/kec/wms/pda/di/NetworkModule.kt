package com.kec.wms.pda.di

import android.util.Log
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.kec.wms.pda.BuildConfig
import com.kec.wms.pda.data.api.AsnApi
import com.kec.wms.pda.data.api.AppUpdateApi
import com.kec.wms.pda.data.api.AuthApi
import com.kec.wms.pda.data.api.CheckoutApi
import com.kec.wms.pda.data.api.InventoryCountApi
import com.kec.wms.pda.data.api.InventoryApi
import com.kec.wms.pda.data.api.ManifestMountApi
import com.kec.wms.pda.data.api.PickingApi
import com.kec.wms.pda.data.api.PutawayApi
import com.kec.wms.pda.data.api.ReturnApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.Proxy
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

private const val DEFAULT_REQUEST_TIMEOUT_SECONDS = 30

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(
        cookieManager: CookieManager,
        authInterceptor: AuthInterceptor,
        debugInterceptor: DebugInterceptor
    ): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor { message ->
            Log.d("HTTP", message)
        }
        loggingInterceptor.level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }

        Log.d("NetworkModule", "create OkHttpClient, baseUrl=${BuildConfig.API_BASE_URL}")

        return OkHttpClient.Builder()
            .proxy(Proxy.NO_PROXY)
            .eventListener(NetworkEventListener())
            .cookieJar(cookieManager.getCookieJar())
            .addInterceptor(debugInterceptor)
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(DEFAULT_REQUEST_TIMEOUT_SECONDS.toLong(), TimeUnit.SECONDS)
            .readTimeout(DEFAULT_REQUEST_TIMEOUT_SECONDS.toLong(), TimeUnit.SECONDS)
            .writeTimeout(DEFAULT_REQUEST_TIMEOUT_SECONDS.toLong(), TimeUnit.SECONDS)
            .callTimeout(DEFAULT_REQUEST_TIMEOUT_SECONDS.toLong(), TimeUnit.SECONDS)
            // Keep this enabled so transient socket drops from the local dev server
            // do not surface as "unexpected end of stream" on the first scan.
            .retryOnConnectionFailure(true)
            .build()
    }

    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder().create()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }

    @Provides
    @Singleton
    fun provideAppUpdateApi(retrofit: Retrofit): AppUpdateApi {
        return retrofit.create(AppUpdateApi::class.java)
    }

    @Provides
    @Singleton
    fun provideAsnApi(retrofit: Retrofit): AsnApi {
        return retrofit.create(AsnApi::class.java)
    }

    @Provides
    @Singleton
    fun provideCheckoutApi(retrofit: Retrofit): CheckoutApi {
        return retrofit.create(CheckoutApi::class.java)
    }

    @Provides
    @Singleton
    fun providePickingApi(retrofit: Retrofit): PickingApi {
        return retrofit.create(PickingApi::class.java)
    }

    @Provides
    @Singleton
    fun provideManifestMountApi(retrofit: Retrofit): ManifestMountApi {
        return retrofit.create(ManifestMountApi::class.java)
    }

    @Provides
    @Singleton
    fun providePutawayApi(retrofit: Retrofit): PutawayApi {
        return retrofit.create(PutawayApi::class.java)
    }

    @Provides
    @Singleton
    fun provideInventoryApi(retrofit: Retrofit): InventoryApi {
        return retrofit.create(InventoryApi::class.java)
    }

    @Provides
    @Singleton
    fun provideInventoryCountApi(retrofit: Retrofit): InventoryCountApi {
        return retrofit.create(InventoryCountApi::class.java)
    }

    @Provides
    @Singleton
    fun provideReturnApi(retrofit: Retrofit): ReturnApi {
        return retrofit.create(ReturnApi::class.java)
    }
}
