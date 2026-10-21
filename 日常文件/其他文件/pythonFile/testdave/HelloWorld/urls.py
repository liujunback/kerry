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
    path('hello/',views.hello1),
    path('hello1/',views.hello2),
    path('robot/',views.robot),
    path('jd/',views.jdtest),
    path('shopee1/',views.shopee),
    path('shopee2/',views.shopee2),
    path('shopee3/',views.shopee3)
]
