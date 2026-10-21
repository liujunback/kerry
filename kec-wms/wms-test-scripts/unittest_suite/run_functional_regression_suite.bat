@echo off
setlocal

cd /d "%~dp0"

if not defined WMS_BASE_URL set "WMS_BASE_URL=https://stg-kec-wms.kec-app.com"
if not defined WMS_TENANT_CODE set "WMS_TENANT_CODE=DEFAULT"
if not defined WMS_USERNAME set "WMS_USERNAME=admin"
if not defined WMS_PASSWORD set "WMS_PASSWORD=Admin@123"
if not defined WMS_WAREHOUSE_CODE set "WMS_WAREHOUSE_CODE=WH-SH-001"
if not defined WMS_CLIENT_CODE set "WMS_CLIENT_CODE=C001"
if not defined WMS_SKU_CODE set "WMS_SKU_CODE="
if not defined WMS_AUTO_CREATE_SKU set "WMS_AUTO_CREATE_SKU=true"
if not defined WMS_USE_SYSTEM_PROXY set "WMS_USE_SYSTEM_PROXY=false"

python run_functional_regression_suite.py
set "EXIT_CODE=%ERRORLEVEL%"

if exist "%~dp0reports" (
    for /f "delims=" %%F in ('dir /b /o-d "%~dp0reports\functional_regression_report_*.html" 2^>nul') do (
        set "LATEST_REPORT=%~dp0reports\%%F"
        goto :open_report
    )
)

:open_report
if defined LATEST_REPORT (
    start "" "%LATEST_REPORT%"
)

pause
exit /b %EXIT_CODE%
