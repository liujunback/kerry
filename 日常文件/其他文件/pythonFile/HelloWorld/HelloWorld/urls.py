"""HelloWorld URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from . import views
from django.contrib import admin
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('hello/openapi/param2/1/ali.intl.onetouch/logistics.order.notifyBizEvent/807500', views.hello),
    path('hello/openapi/param2/1/ali.intl.onetouch/logistics.order.notifyTrace/807500', views.hello),
    path('create/',views.create),
    path('search/',views.search_post),
    path('hello',views.hello1),
    # path('hello1/',views.hello2),
    path('robot/',views.robot),
    path('jd/',views.jdtest),
    path('shopee1/',views.shopee),
    path('shopee2/',views.shopee2),
    path('shopee3/',views.shopee3),
    path('cainiao',views.cainiao),
    path('status',views.status),
    path('spider/cancel/DUMMY19940047781',views.spider),
    path('spider/jhy',views.jhy),
    path('selectTrack',views.shougao),
    path('api/Waybill/TrackingDesc',views.quadpro),
    path('hermes',views.hermes),
    path('register',views.status_spider),
    path('api/v2/logistics/ship_order',views.ship_order),
    path('api/v2/order/get_order_detail',views.get_order_detail),
    path('api/v2/order/get_order_list',views.get_order_list),
    path('api/v2/logistics/get_shipping_parameter',views.get_shipping_parameter),
    path('v1/parcel/TESTTORI20230613000010/track',views.shaoke),
    path('SF',views.hello1),
]
