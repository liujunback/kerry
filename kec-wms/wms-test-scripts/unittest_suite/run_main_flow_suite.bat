@echo off
setlocal

cd /d "%~dp0"

if not defined WMS_BASE_URL set "WMS_BASE_URL=https://stg-kec-wms.kec-app.com"
if not defined WMS_TENANT_CODE set "WMS_TENANT_CODE=DEFAULT"
if not defined WMS_USERNAME set "WMS_USERNAME=admin"
if not defined WMS_PASSWORD set "WMS_PASSWORD=Admin@123"
if not defined WMS_WAREHOUSE_CODE set "WMS_WAREHOUSE_CODE=WH-SH-001"
if not defined WMS_CLIENT_CODE set "WMS_CLIENT_CODE=C001"
if not defined WMS_SKU_CODE set "WMS_SKU_CODE=SKU029"
if not defined WMS_USE_SYSTEM_PROXY set "WMS_USE_SYSTEM_PROXY=false"

echo ========================================
echo Running WMS main flow unittest suite...
echo BASE_URL=%WMS_BASE_URL%
echo TENANT=%WMS_TENANT_CODE%
echo USERNAME=%WMS_USERNAME%
echo WAREHOUSE=%WMS_WAREHOUSE_CODE%
echo CLIENT=%WMS_CLIENT_CODE%
echo SKU=%WMS_SKU_CODE%
echo ========================================

python run_main_flow_suite.py
set "EXIT_CODE=%ERRORLEVEL%"

if exist "%~dp0reports" (
    for /f "delims=" %%F in ('dir /b /o-d "%~dp0reports\main_flow_report_*.html" 2^>nul') do (
        set "LATEST_REPORT=%~dp0reports\%%F"
        goto :open_report
    )
)

:open_report
if defined LATEST_REPORT (
    echo Report: %LATEST_REPORT%
    start "" "%LATEST_REPORT%"
)

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Test suite finished with failures. Exit code: %EXIT_CODE%
    pause
    exit /b %EXIT_CODE%
)

echo.
echo Test suite finished successfully.
pause
exit /b 0
