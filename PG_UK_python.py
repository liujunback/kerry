import pandas as pd
import numpy as np
import mysql.connector
import ast
from sqlalchemy import create_engine
from openpyxl import Workbook
from openpyxl.styles import PatternFill
from openpyxl.utils import get_column_letter
from datetime import datetime, timedelta
import calendar

#config database
# config = {
#     'host':'database-sg.cluster-ro-cmoidmw2amab.ap-southeast-1.rds.amazonaws.com',
#     'user': 'foms.monitor.read',
#     'password' :'QFv4OqCxVErHHnp',
#     'database': 'kec_foms'
# }
#config orgId
orgId = '134'

now = datetime.now()
if now.month == 1:
    # If the current month is January, go to December of the previous year
    first_day_last_month = datetime(now.year - 1, 12, 1)
else:
    # Otherwise, just go to the first day of the previous month
    first_day_last_month = datetime(now.year, now.month - 1, 1)
    
currentDate = datetime(now.year, now.month, 1)

timeCountFrom = first_day_last_month
timeCountTo = currentDate
print(timeCountFrom)
print(timeCountTo)
if now.month == 1:
    last_day = calendar.monthrange(now.year - 1, 12)[1]
    formatted_last_day = f"{now.year - 1}-12-{last_day:02d}"
else:
    last_day = calendar.monthrange(now.year, now.month - 1)[1]
    formatted_last_day = f"{now.year}-{now.month - 1:02d}-{last_day:02d}"

#billing item fee
#External CNY
mutipleItemFee = "2.9"
sigleItemFee = "2.7"
# #External GBP
# mutipleItemFee = "0.3"
# sigleItemFee = "0.2"
#Internal
mutipleItemFeeIn = "0.3"
sigleItemFeeIn = "0.3"
#Cost
mutipleItemFeeCost = "0.3"
sigleItemFeeCost = "0.2"

#weight
#External CNY
weight1 = "3.7" #0<w<=0.5kg
weight2 = "4.0" #0.5< w <=1kg
weight3 = "6.6" #1< w <=3 kg
weight4 = "9.2" #3< w <= 5kg
weight5 = "13.3" #5 < w <=10kg
additionWeight = "2" # extra charge per kg
# #External GBP
# weight1 = "0.3" #0<w<=0.5kg
# weight2 = "0.4" #0.5< w <=1kg
# weight3 = "0.6" #1< w <=3 kg
# weight4 = "0.8" #3< w <= 5kg
# weight5 = "1.2" #5 < w <=10kg
# additionWeight = "0.2" # extra charge per kg




#Internal
weight1_In = "0.4" #0<w<=0.5kg
weight2_In = "0.4" #0.5< w <=1kg
weight3_In = "0.7" #1< w <=3 kg
weight4_In = "0.9" #3< w <= 5kg
weight5_In = "1.3" #5 < w <=10kg
additionWeight_In = "0.2" # extra charge per kg

#Cost
weight1_Cost = "0.3" #0<w<=0.5kg
weight2_Cost = "0.4" #0.5< w <=1kg
weight3_Cost = "0.6" #1< w <=3 kg
weight4_Cost = "0.8" #3< w <= 5kg
weight5_Cost = "1.2" #5 < w <=10kg
additionWeight_Cost = "0.2" # extra charge per kg


#packagr material
#External
materialFee = {
    'S-Bag': 0.45, 
    'M-Bag': 0.78,
    'L-Bag': 1.35,
    'S-Box':10,
    'M-Box': 20,
    'Default Box':0,

}


materialFee_In = {
    'S-Bag': 0.5, 
    'M-Bag': 0.9,
    'L-Bag': 1.5,
    'S-Box':0.5,
    'M-Box': 2.2,
    'Default Box':0,
}

materialFee_Cost = {
    'S-Bag': 0.45, 
    'M-Bag': 0.78,
    'L-Bag': 1.35,
    'S-Box':0.45,
    'M-Box': 2,
    'Default Box':0,
}

#asn charge
#external 
asnFirstItem = "1.2"
asnAdditionItem = "1.2"
asnUploadCharge = float(0.5)
#internal
asnFirstItem_In = "0.12"
asnAdditionItem_In = "0.12"
asnUploadCharge_In = float(0.05)
#cost
asnFirstItem_Cost = "0.1"
asnAdditionItem_Cost = "0.1"
asnUploadCharge_Cost = float(0.04)


#storage config

twms_orgId = 10
twms_warehouse = 1

storage_fee_Ex = 0.95
storage_fee_Ex_120 = 0.95
storage_fee_Ex_180 = 0.95
storage_fee_Ex_360 = 0.95
storage_fee_Ex_999 = 0.95

storage_fee_In = 0.95
storage_fee_In_120 = 0.95
storage_fee_In_180 = 0.95
storage_fee_In_360 = 0.95
storage_fee_In_999 = 0.95

storage_fee_Co = 0


#connect sql
connection = mysql.connector.connect(
        host='10.247.65.105',
        port=53306 ,
        user='admin',
        password='M65OJvzGnbwu7ViejE3R',
        database= "stg_kec_foms"
)


# read order details in sql
orderQuery = f"""
SELECT fo.id,   CONVERT_TZ(fo.createdAt, '+00:00', '+08:00') as orderCreateAt,CONVERT_TZ(foo.handoverAt, '+00:00', '+08:00') as orderFulfilled ,fo.orderNumber,  ww.virtualWarehouseCode ,cs.serviceCode , sku.skuCode,oi.quantity as "requestQty" , pp.quantity as "fulfilledQty" , JSON_EXTRACT(skua.content, '$.weight') AS skuWeight , fo.status 
FROM `FULFILLMENT_ORDER` as fo 
inner join CONFIG_WMS_WAREHOUSE_ACCOUNT as ww on ww.id = fo.warehouseAccountId
inner join `FULFILLMENT_ORDER_TIMESTAMP` as foo on foo.id = fo.timestampId
inner join FULFILLMENT_ORDER_ITEM as oi on oi.orderId = fo.id
inner join FULFILLMENT_SKU as sku on sku.id = oi.skuId
inner join FULFILLMENT_ORDER_ITEM_PACKAGE as pp on pp.orderItemId = oi.id
inner join FULFILLMENT_SKU_ATTRIBUTE as skua on skua.skuId = sku.id
left join CONFIG_WMS_COURIER_SERVICE as cs on cs.id = fo.courierServiceId

WHERE 
    fo.orgId = '{orgId}' 
    AND CONVERT_TZ(foo.handoverAt, '+00:00', '+08:00') BETWEEN '{timeCountFrom}' AND '{timeCountTo}'
    and skua.attribute = 'dimensions'
"""

#change sql to df
orderData = pd.read_sql(orderQuery, connection)
df = pd.DataFrame (orderData)



df["skuWeight"]  = pd.to_numeric(df["skuWeight"])
df["fulfilledQty"]  = pd.to_numeric(df["fulfilledQty"])
df['totalWeight'] = df["skuWeight"] * df["fulfilledQty"]

#billing logic add column
df['skuCount'] = df.groupby('orderNumber')['skuCode'].transform('nunique')
df['sumFulfilledQty'] = df.groupby('orderNumber')['fulfilledQty'].transform('sum')
df['sumSKUWeight'] = df.groupby('orderNumber')['totalWeight'].transform('sum')

# item type additional charge billing

def calculate_orderItem(skuCount, sumFulfilledQty):
   if (skuCount>1) & (sumFulfilledQty > 1):
       fee = (sumFulfilledQty-1)*float(mutipleItemFee)
      
       return fee
   elif(skuCount == 1) & (sumFulfilledQty > 1):
        return (sumFulfilledQty-1)*float(sigleItemFee)
   else:
       return 0
       
def calculate_orderItem1(skuCount, sumFulfilledQty):
   if (skuCount>1) & (sumFulfilledQty > 1):
       fee = (sumFulfilledQty-1)*float(mutipleItemFeeIn)
       return fee
   elif(skuCount == 1) & (sumFulfilledQty > 1):
        return (sumFulfilledQty-1)*float(sigleItemFeeIn)
   else:
       return 0

def calculate_orderItem2(skuCount, sumFulfilledQty):
   if (skuCount>1) & (sumFulfilledQty > 1):
       fee = (sumFulfilledQty-1)*float(mutipleItemFeeCost)
       return fee
   elif(skuCount == 1) & (sumFulfilledQty > 1):
        return (sumFulfilledQty-1)*float(sigleItemFeeCost)
   else:
       return 0
       



# df['additionCountFee'] = np.where(
#     (df['skuCount'] > 1)&( df['sumFulfilledQty']>1),
#       (df['sumFulfilledQty']-1) * float(mutipleItemFee), np.where(
#           (df['skuCount'] == 1)&( df['sumFulfilledQty']>1),
#           (df['sumFulfilledQty']-1) * float(sigleItemFee),0
#       )
#       )

#weight charge range
def calculate_price(w):
    if 0<=w<=0.5:
        return float(weight1)
    elif 0.5< w <=1:
        return float(weight2)
    elif 1< w <=3:

        return float(weight3)
    elif 3< w<= 5:

        return float(weight4)
    elif 5<w<=10:

        return float(weight5)

    elif w>10:
        price = (w-10)*float(additionWeight) +float(weight5)

        return float(price)

    else:
        return "not found"
    

def calculate_price1(w):
    if 0<=w<=0.5:
        return float(weight1_In)
    elif 0.5< w <=1:
        return float(weight2_In)
    elif 1< w <=3:
        return float(weight3_In)
    elif 3< w<= 5:
        return float(weight4_In)
    elif 5<w<=10:
        return float(weight5_In)

    elif w>10:
        price = (w-10)*float(additionWeight_In) +float(weight5_In)
        return float(price)

    else:
        return "not found"
    
def calculate_price2(w):
    if 0<=w<=0.5:
        return float(weight1_Cost)
    elif 0.5< w <=1:
        return float(weight2_Cost)
    elif 1< w <=3:
        return float(weight3_Cost)
    elif 3< w<= 5:
        return float(weight4_Cost)
    elif 5<w<=10:
        return float(weight5_Cost)

    elif w>10:
        price = (w-10)*float(additionWeight_Cost) +float(weight5_Cost)
        return float(price)

    else:
        return "not found"
    
    

#parcel weighh charge 
df['additionCountFee_External'] = df.apply(lambda row: calculate_orderItem(row['skuCount'], row['sumFulfilledQty']), axis=1)
df['additionCountFee_Internal'] = df.apply(lambda row: calculate_orderItem1(row['skuCount'], row['sumFulfilledQty']), axis=1)
df['additionCountFee_Cost'] = df.apply(lambda row: calculate_orderItem2(row['skuCount'], row['sumFulfilledQty']), axis=1)


df['weightCharge'] = df['sumSKUWeight'].apply(calculate_price)
df['weightFee_Internal'] = df['sumSKUWeight'].apply(calculate_price1)
df['weightFee_Cost'] = df['sumSKUWeight'].apply(calculate_price2)

# remove duplicate
df.loc[df.duplicated('orderNumber', keep='first'), 'additionCountFee_External'] = np.nan
df.loc[df.duplicated('orderNumber', keep='first'), 'skuCount'] = np.nan
df.loc[df.duplicated('orderNumber', keep='first'), 'sumFulfilledQty'] = np.nan
df.loc[df.duplicated('orderNumber', keep='first'), 'sumSKUWeight'] = np.nan
df.loc[df.duplicated('orderNumber', keep='first'), 'weightCharge'] = np.nan
df.loc[df.duplicated('orderNumber', keep='first'), 'additionCountFee_Cost'] = np.nan
df.loc[df.duplicated('orderNumber', keep='first'), 'additionCountFee_Internal'] = np.nan
df.loc[df.duplicated('orderNumber', keep='first'), 'weightFee_Internal'] = np.nan
df.loc[df.duplicated('orderNumber', keep='first'), 'weightFee_Cost'] = np.nan

print(df)


#####################asn

#package material


packaeQuery = f"""
SELECT CONVERT_TZ(oo.createdAt, '+00:00', '+08:00') as orderCreateAt, CONVERT_TZ(foo.handoverAt, '+00:00', '+08:00') as orderHandoverAt  ,   oo.orderNumber  , oe.content  , oo.status 
FROM FULFILLMENT_ORDER_EXTENSION as oe
inner join  FULFILLMENT_ORDER as oo on oo.id = oe.orderId
inner join `FULFILLMENT_ORDER_TIMESTAMP` as foo on foo.id = oo.timestampId
WHERE oo.orgId = '{orgId}' AND 
CONVERT_TZ(foo.handoverAt, '+00:00', '+08:00') BETWEEN '{timeCountFrom}' AND '{timeCountTo}'
and oe.field = 'packagingMaterials' and oo.status = 'FULFILLED'
"""

packageData = pd.read_sql(packaeQuery, connection)
packagedf = pd.DataFrame (packageData)

packagedf['content'] = packagedf['content'].apply(ast.literal_eval)
exploded_df = packagedf.explode('content')
content_df = exploded_df['content'].apply(pd.Series)
packagedf = pd.concat([exploded_df.drop(columns=['content']), content_df], axis=1)
packagedf.rename(columns={'code': 'packageMaterialCode'}, inplace=True)
packagedf.rename(columns={'qty': 'packageMaterialQty'}, inplace=True)



if not packagedf.empty:

    def calculate_packageFee(packageMaterialCode, qty):
        total_fee = materialFee.get(packageMaterialCode,0) * float(qty)
        return total_fee

    def calculate_packageFeeIn(packageMaterialCode, qty):
        total_fee = materialFee_In.get(packageMaterialCode,0) * float(qty)
        return total_fee

    def calculate_packageFeeCost(packageMaterialCode, qty):
        total_fee = materialFee_Cost.get(packageMaterialCode,0) * float(qty)
        return total_fee

    packagedf['packageFee'] = packagedf.apply(lambda row: calculate_packageFee(row['packageMaterialCode'], row['packageMaterialQty']), axis=1)

    packagedf['packageFee_Internal'] = packagedf.apply(lambda row: calculate_packageFeeIn(row['packageMaterialCode'], row['packageMaterialQty']), axis=1)

    packagedf['packageFee_Cost'] = packagedf.apply(lambda row: calculate_packageFeeCost(row['packageMaterialCode'], row['packageMaterialQty']), axis=1)

    #packagedf.loc[packagedf.duplicated('orderNumber', keep='first'), 'packageFee'] = np.nan

else:
    packagedf['packageFee'] = ""
    packagedf['packageFee_Internal'] = ""
    packagedf['packageFee_Cost'] = ""

print(packagedf)

# SELECT CONVERT_TZ( asn.createdAt, '+00:00', '+08:00') as asnCreateDate  ,asn.asnNumber, ww.virtualWarehouseCode ,asn.isReturnAsn,CONVERT_TZ( asn.confirmedTime , '+00:00', '+08:00')  as asnConfirmDate ,asn.status, sku.skuCode,asi.asnQty,asi.receivedQty ,JSON_EXTRACT(skuat.content, '$.weight') AS skuWeight
# FROM FULFILLMENT_ASN as asn 
# inner join CONFIG_WMS_WAREHOUSE_ACCOUNT as ww on ww.id = asn.warehouseAccountId
# inner join FULFILLMENT_ASN_ITEM as asi on asi.asnId = asn.id
# inner join FULFILLMENT_SKU as sku on sku.id = asi.skuId
# inner join FULFILLMENT_SKU_ATTRIBUTE as skuat on skuat.skuId = sku.id
# WHERE asn.status = 'CONFIRMED' and asn.orgId = '{orgId}' and CONVERT_TZ( asn.confirmedTime , '+00:00', '+08:00') BETWEEN '{timeCountFrom}' and '{timeCountTo}' and skuat.attribute = 'dimensions'
##################
asnQuery = f"""

SELECT 
    CONVERT_TZ(asn.createdAt, '+00:00', '+08:00') AS asnCreateDate,
    asn.asnNumber,
    ww.virtualWarehouseCode,
    asn.isReturnAsn,
    asn.remark,
    CONVERT_TZ(asn.confirmedTime, '+00:00', '+08:00') AS asnConfirmDate,
    asn.status,
    sku.skuCode,
    SUM(asi.asnQty) AS totalAsnQty,
    asi.receivedQty,
    JSON_EXTRACT(skuat.content, '$.weight') AS skuWeight
FROM 
    FULFILLMENT_ASN AS asn 
INNER JOIN 
    CONFIG_WMS_WAREHOUSE_ACCOUNT AS ww ON ww.id = asn.warehouseAccountId
INNER JOIN 
    FULFILLMENT_ASN_ITEM AS asi ON asi.asnId = asn.id
INNER JOIN 
    FULFILLMENT_SKU AS sku ON sku.id = asi.skuId
LEFT JOIN 
    FULFILLMENT_SKU_ATTRIBUTE AS skuat ON skuat.skuId = sku.id 
    AND (skuat.attribute = 'dimensions' OR skuat.attribute IS NULL)
WHERE 
    asn.status = 'CONFIRMED' 
    AND asn.orgId = '{orgId}' 
    AND CONVERT_TZ(asn.confirmedTime, '+00:00', '+08:00') BETWEEN '{timeCountFrom}' AND '{timeCountTo}'
GROUP BY 
    asnCreateDate, asn.asnNumber, ww.virtualWarehouseCode, asn.isReturnAsn, asnConfirmDate, asn.status, sku.skuCode, asi.receivedQty;
"""

asnData = pd.read_sql(asnQuery, connection)
asnDatadf = pd.DataFrame (asnData)


if not asnDatadf.empty:

    asnDatadf["skuWeight"]  = pd.to_numeric(asnDatadf["skuWeight"])
    asnDatadf["receivedQty"]  = pd.to_numeric(asnDatadf["receivedQty"])

    asnDatadf['sumAsnQTY'] = asnDatadf.groupby('asnNumber')['receivedQty'].transform('sum')
    asnDatadf['totalSKUWeight'] = asnDatadf["skuWeight"]*asnDatadf["receivedQty"]
    asnDatadf['sumASNWeight'] = asnDatadf.groupby('asnNumber')['totalSKUWeight'].transform('sum')

    asnDatadf.loc[asnDatadf.duplicated('asnNumber', keep='first'), 'sumAsnQTY'] = np.nan
    asnDatadf.loc[asnDatadf.duplicated('asnNumber', keep='first'), 'sumASNWeight'] = np.nan

    #item count fee
    def calculate_asnFee(asnFee,isReturnAsn):
        first_qty = 1
        addition_qty= float(asnFee)-1

        if(isReturnAsn == 1):
            return 0
        elif (isReturnAsn == 0):
            return first_qty*float(asnFirstItem) + addition_qty*float(asnAdditionItem)

    def calculate_asnFee1(asnFee,isReturnAsn):
        first_qty = 1
        addition_qty= float(asnFee)-1

        if(isReturnAsn == 1):
            return 0
        elif (isReturnAsn == 0):
            return first_qty*float(asnFirstItem_In) + addition_qty*float(asnAdditionItem_In)

    def calculate_asnFee2(asnFee,isReturnAsn):
        first_qty = 1
        addition_qty= float(asnFee)-1

        if(isReturnAsn == 1):
            return 0
        elif (isReturnAsn == 0):
            return first_qty*float(asnFirstItem_Cost) + addition_qty*float(asnAdditionItem_Cost)
        
    #asn weight uploading charge
    def calculate_asnWeightFee(aw , isReturnAsn):
        if(isReturnAsn == 1):
            return 0
        else:
            aw = float(aw)
            return aw * asnUploadCharge
        
    def calculate_asnWeightFee1(aw,isReturnAsn):
        if(isReturnAsn == 1):
            return 0
        else:
            aw = float(aw)
            return aw * asnUploadCharge_In
    def calculate_asnWeightFee2(aw,isReturnAsn):
        if(isReturnAsn == 1):
            return 0
        else:
            aw = float(aw)
            return aw * asnUploadCharge_Cost

    asnDatadf['asnItemfee'] = asnDatadf.apply(lambda row: calculate_asnFee(row['sumAsnQTY'], row['isReturnAsn']), axis=1)
    asnDatadf['asnItemfee_In'] = asnDatadf.apply(lambda row: calculate_asnFee1(row['sumAsnQTY'], row['isReturnAsn']), axis=1)
    asnDatadf['asnItemfee_Cost'] = asnDatadf.apply(lambda row: calculate_asnFee2(row['sumAsnQTY'], row['isReturnAsn']), axis=1)


    asnDatadf['uploadingFee'] = asnDatadf.apply( lambda row: calculate_asnWeightFee(row['sumASNWeight'], row['isReturnAsn']), axis=1)
    asnDatadf['uploadingFee_In'] = asnDatadf.apply( lambda row: calculate_asnWeightFee1(row['sumASNWeight'], row['isReturnAsn']), axis=1)
    asnDatadf['uploadingFee_Cost'] = asnDatadf.apply( lambda row: calculate_asnWeightFee2(row['sumASNWeight'], row['isReturnAsn']), axis=1)

else:

    asnDatadf['sumASNWeight'] = ""
    asnDatadf['sumAsnQTY'] = ""
    asnDatadf['asnItemfee'] = ""
    asnDatadf['asnItemfee_In'] = ""
    asnDatadf['asnItemfee_Cost'] = ""
    asnDatadf['uploadingFee'] = ""
    asnDatadf['uploadingFee_In'] = ""
    asnDatadf['uploadingFee_Cost'] = ""



asnDatadf = asnDatadf.drop(columns=['uploadingFee_In', 'uploadingFee_Cost', 'uploadingFee'])

print(asnDatadf)
###vas
###vas item
vasQuery = f"""
SELECT ww.description, du.eventDate,chargeOption,   JSON_VALUE(du.configuration, '$.baseChargePerUOM') AS baseCharge,du.remark, JSON_VALUE(du.configuration, '$.qty') AS qty , du.totalAmount as "Amount"  
FROM `DAILY_USAGE` as du 
inner join CONFIG_WMS_WAREHOUSE_ACCOUNT as ww on ww.id = du.warehouseAccountId
WHERE du.orgId = '{orgId}' and du.chargeType = "EXTERNAL" and eventDate between '{timeCountFrom}' AND '{timeCountTo}';
"""

# Convert query results to DataFrame
vasData = pd.read_sql(vasQuery, connection)
vasDf = pd.DataFrame(vasData)

# Convert numeric columns
vasDf["Amount"] = pd.to_numeric(vasDf["Amount"])
vasDf["baseCharge"] = pd.to_numeric(vasDf["baseCharge"])
vasDf["qty"] = pd.to_numeric(vasDf["qty"])

########storage
Twmsconfig = {
    'host':'database-twms.cluster-cavxot8qt9on.eu-west-3.rds.amazonaws.com',
    'user': 'crystal.liang',
    'password' :').yRXV*FvEs8CzYC',
    'database': 'times_waffle_gb'
}


connection = mysql.connector.connect(**Twmsconfig)



stocks = f"""
SELECT
    SUM(qty) AS total_qty,
    asn_id,
    sku_id,
    client_id,
    centre_id,

    receive_at,

    handover_at,
    DATE(receive_at) AS rcDate,
    DATE(handover_at) AS hdDate
FROM
    `stocks`
WHERE
    `centre_id` = {twms_warehouse} AND `client_id` = {twms_orgId} AND(
        handover_at IS NULL OR handover_at > '{timeCountFrom}'
    ) AND `receive_at` < '{timeCountTo}' AND `stocks`.`deleted_at` IS NULL
    
GROUP BY
    `handover_at`,
    `asn_id`,
    `sku_id`,
    `rcDate`

    
"""

stocks = pd.read_sql(stocks, connection)
stocksdf = pd.DataFrame (stocks)

print(stocksdf)


asnName = f"""
SELECT id,asn_number FROM `asns`
WHERE centre_id = {twms_warehouse} and client_id = {twms_orgId}
"""

asnName = pd.read_sql(asnName, connection)
asnD = pd.DataFrame (asnName)
print(asnD)


skuName = f"""
SELECT id,code as skuCode ,barcode,name as skuName,length,width,height,weight FROM `skus` 
WHERE client_id = {twms_orgId}


"""
skuName = pd.read_sql(skuName, connection)
skuDatadf = pd.DataFrame (skuName)

merged_df = pd.merge(stocksdf, asnD, left_on='asn_id', right_on='id', how='inner')
print(merged_df)
final_df = pd.merge(merged_df, skuDatadf, left_on='sku_id', right_on='id', how='inner')
print(final_df)

final_df["Client Code"] = "PGGB"
final_df["Warehouse Code"] = "UK TWMS"
new_order = ['Client Code' , 'Warehouse Code' , 'skuCode' , 'barcode','skuName','length','width','height','weight','receive_at','handover_at','rcDate','hdDate','asn_number','total_qty']

newDf = final_df[new_order]

###cal storage age

newDf['rcDate'] = pd.to_datetime(newDf['rcDate'])
newDf['hdDate'] = pd.to_datetime(newDf['hdDate'])


newDf['rcDate'] = newDf['rcDate'].dt.date
newDf['hdDate'] = newDf['hdDate'].dt.date


newDf['unit cbm'] = round((newDf['length'] * newDf['width'] * newDf['height']) / 1000000 ,3)

newDf['unit cbm'] = newDf['unit cbm'].apply(lambda x: max(x, 0.001))

newDf['total cbm'] = newDf['unit cbm'] * newDf['total_qty']

billing_dates = pd.date_range(start=f"'{timeCountFrom}'", end=f"'{formatted_last_day}'")
billing_dates = billing_dates.date

results = []


# Iterate over each billing date
for billing_date in billing_dates:
    for _, row in newDf.iterrows():

        # Create a copy of the row to modify

        if row['receive_at'] <= billing_date:
            
            if row['handover_at'] < billing_date:
                continue

            else:
                #print(f"billing date: {billing_date}    asn number: {row['asn_number']}  handover at: {row['handover_at']}")

                new_row = row.copy()
                new_row['billing date'] = billing_date

          
        else:
            
            continue

        results.append(new_row)

# Convert to datetime


# Calculate Storage Age in days

result_df = pd.DataFrame(results)
print(result_df)


# Drop the specified columns
result_df = result_df.drop(columns=['handover_at', 'rcDate','hdDate'])

result_df['billing date'] = pd.to_datetime(result_df['billing date'])

result_df['Storage Age'] = (result_df['billing date'].dt.date - result_df['receive_at'].dt.date).apply(lambda x: x.days + 1) 

result_df['billing date'] = result_df['billing date'].dt.date
result_df['receive_at'] = result_df['receive_at'].dt.date


def calculate_storageFee(storageAge , cbm):
    if storageAge <=90:
        return storage_fee_Ex*cbm 
    elif storageAge <= 120:
        return storage_fee_Ex_120 * cbm
    elif storageAge <= 180:
        return storage_fee_Ex_180 * cbm
    elif storageAge <= 360:
        return storage_fee_Ex_360 * cbm
    elif storageAge <= 999:
        return storage_fee_Ex_999 * cbm


def calculate_storageFeeIn(storageAge , cbm):
    if storageAge <=90:
        return storage_fee_In*cbm 
    elif storageAge <= 120:
        return storage_fee_In_120 * cbm
    elif storageAge <= 180:
        return storage_fee_In_180 * cbm
    elif storageAge <= 360:
        return storage_fee_In_360 * cbm
    elif storageAge <= 999:
        return storage_fee_In_999 * cbm
    

result_df['Storage Fee(External)']= result_df.apply(lambda row: calculate_storageFee(row['Storage Age'], row['total cbm']), axis=1)

result_df['Storage Fee(Internal)'] = result_df.apply(lambda row: calculate_storageFeeIn(row['Storage Age'], row['total cbm']), axis=1)
result_df['Storage Fee(Cost)'] = storage_fee_Co

print(result_df)




######summary
#summary sheet
#Inbound

total_asnItemFee_Ex = asnDatadf['asnItemfee'].sum()
total_asnItemFee_In = asnDatadf['asnItemfee_In'].sum()
total_asnItemFee_Cost = asnDatadf['asnItemfee_Cost'].sum()

# total_uploading_fee_Ex = asnDatadf['uploadingFee'].sum()
# total_uploading_fee_In = asnDatadf['uploadingFee_In'].sum()
# total_uploading_fee_Cost = asnDatadf['uploadingFee_Cost'].sum()


#outbound
total_outbound_fee_ex = df['additionCountFee_External'].sum()
total_outbound_fee_in = df['additionCountFee_Internal'].sum()
total_outbound_fee_cost = df['additionCountFee_Cost'].sum()

total_weight_ex = df['weightCharge'].sum()
total_weight_in = df['weightFee_Internal'].sum()
total_weight_cost = df['weightFee_Cost'].sum()


#package fee
total_package_fee_ex = packagedf['packageFee'].sum()
total_package_fee_in = packagedf['packageFee_Internal'].sum()
total_package_fee_cost = packagedf['packageFee_Cost'].sum()


#inbound_count
inbound_pcs = (asnDatadf[asnDatadf['isReturnAsn'] != 1]['sumAsnQTY']).sum()


upload_kg = (asnDatadf[asnDatadf['isReturnAsn'] != 1]['sumASNWeight']).sum()


#return pcs
inbound_return_pcs = (asnDatadf[asnDatadf['isReturnAsn'] == 1]['sumAsnQTY']).sum()

#outbound

#storage
total_cbm = result_df['total cbm'].sum()
storage_Ex = result_df['Storage Fee(External)'].sum()
storage_In = result_df['Storage Fee(Internal)'].sum()
storage_Co = result_df['Storage Fee(Cost)'].sum()

summary_data = {
     'Description':['Storage','','Inbound Pcs Count' , '' ,'Outbound - Weight Charge' , '' , 'Outbound Mutiple Item Charge','' ,'Package Charge'],

    'Qty':[total_cbm,'',inbound_pcs , '','' , '' , '','' ,''],
    'Total Amount(External) CNY':[storage_Ex,'',total_asnItemFee_Ex , '' ,total_weight_ex , '' , total_outbound_fee_ex,'' ,total_package_fee_ex],
    'Total Amount(Internal) GBP':[storage_In,'',total_asnItemFee_In , '' ,total_weight_in , '' , total_outbound_fee_in,'' ,total_package_fee_in], 
    'Total Amount(Cost) GBP':[storage_Co,'',total_asnItemFee_Cost , '',total_weight_cost , '' , total_outbound_fee_cost,'' ,total_package_fee_cost]
}
summary_df = pd.DataFrame(summary_data)
print(summary_df)


#########

fileDate = now.strftime("%Y%m%d")
file_path = fr'C:\Users\bliuj\Desktop\kerry\PGUK_{fileDate}.xlsx'

with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
    summary_df.to_excel(writer, sheet_name='summary', index=False)  #
    result_df.to_excel(writer, sheet_name='storage', index=False)  # First DataFrame in 'Table1' 
    asnDatadf.to_excel(writer, sheet_name='asnDate', index=False)  # 
    df.to_excel(writer, sheet_name='orderData', index=False)  # First DataFrame in 'Table1'
    packagedf.to_excel(writer, sheet_name='packageData', index=False)  # Second DataFrame in 'Table2'
    vasDf.to_excel(writer, sheet_name='vas', index=False)  # Second DataFrame in 'Table2'



    color_mapping = {
        'Storage Fee(External)': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow
        'Storage Fee(Internal)': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow
        'Storage Fee(Cost)': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow


        'asnItemfee': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow
        'asnItemfee_In': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow
        'asnItemfee_Cost': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow

        'uploadingFee': PatternFill(start_color='d6ffdd', end_color='d6ffdd', fill_type='solid'),  # Yellow
        'uploadingFee_In': PatternFill(start_color='d6ffdd', end_color='d6ffdd', fill_type='solid'),  # Yellow
        'uploadingFee_Cost': PatternFill(start_color='d6ffdd', end_color='d6ffdd', fill_type='solid'),  # Yellow


        'packageFee': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow
        'packageFee_Internal': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow
        'packageFee_Cost': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # Yellow

        'additionCountFee_External': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # yellow
        'additionCountFee_Internal': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # yellow
        'additionCountFee_Cost': PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid'),  # green
        
        'weightCharge': PatternFill(start_color='d6ffdd', end_color='d6ffdd', fill_type='solid'),  # Yellow
        'weightFee_Cost': PatternFill(start_color='d6ffdd', end_color='d6ffdd', fill_type='solid'),  # blue
        'weightFee_Internal': PatternFill(start_color='d6ffdd', end_color='d6ffdd', fill_type='solid'),  # green
        
    }

    worksheet = writer.sheets['asnDate']
    worksheet1 = writer.sheets['packageData']
    worksheet2 = writer.sheets['orderData']
    worksheet3 = writer.sheets['storage']

    # Change color of the header row based on column name
    for col in asnDatadf.columns:
        fill_color = color_mapping.get(col)
        if fill_color:  # Check if a color is defined for this column
            col_letter = get_column_letter(asnDatadf.columns.get_loc(col) + 1)  # Get Excel column letter
            worksheet[col_letter + '1'].fill = fill_color  # Change the header color


    for col in packagedf.columns:
        fill_color = color_mapping.get(col)
        if fill_color:  # Check if a color is defined for this column
            col_letter = get_column_letter(packagedf.columns.get_loc(col) + 1)  # Get Excel column letter
            worksheet1[col_letter + '1'].fill = fill_color  # Change the header color

    for col in df.columns:
        fill_color = color_mapping.get(col)
        if fill_color:  # Check if a color is defined for this column
            col_letter = get_column_letter(df.columns.get_loc(col) + 1)  # Get Excel column letter
            worksheet2[col_letter + '1'].fill = fill_color  # Change the header color

    for col in result_df.columns:
            fill_color = color_mapping.get(col)
            if fill_color:  # Check if a color is defined for this column
                col_letter = get_column_letter(result_df.columns.get_loc(col) + 1)  # Get Excel column letter
                worksheet2[col_letter + '1'].fill = fill_color  # Change the header color

    for sheet in writer.sheets:
        ws = writer.sheets[sheet]
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter  # Get the column letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = (max_length + 2)  # Add some padding
            ws.column_dimensions[column_letter].width = adjusted_width


print(f'DataFrames have been exported to {file_path}')



# ############auto email trigger
#
# from O365 import Account, FileSystemTokenBackend
# o365_client_id="4e7866d9-5354-4a5b-a300-5f39f44a81ae"
# o365_client_secret = os.getenv("O365_CLIENT_SECRET")
# o365_token = os.getenv("O365_TOKEN")
# def send_mail(from_mailbox, to, subject, body, attachments):
#     credentials = (o365_client_id, o365_client_secret)
#     token_backend = FileSystemTokenBackend(token_path='env', token_filename=o365_token)
#     account = Account(credentials, token_backend=token_backend)
#     if not account.is_authenticated:
#         if account.authenticate(scopes=['basic', 'message_all', 'mailbox_shared', 'message_send_shared']):
#             print('Authenticated!')
#         else:
#             print('Unable to authenticate')
#             return
#
#     mailbox = account.mailbox(from_mailbox)
#     m = mailbox.new_message()
#     for i in to:
#         m.to.add(i)
#     m.subject = subject
#     m.body = body
#     m.content_type = 'HTML'  # 添加这一行，指定内容类型为 HTML
#
#
#     for i in attachments:
#         m.attachments.add(i)
#     m.send()
#
#
#
# # Email content
# email_subject = f"PGGB Billing {timeCountFrom.strftime('%Y/%m')} Auto Email"
# email_body = f"""<html>
# <body>
# <p>Hi All,</p>
#
# <p>Please find attached the PGGB Billing Report for {timeCountFrom.strftime('%B %Y')}.</p>
#
# <p>Billing Details:<br>
# - Period: {timeCountFrom.strftime('%B %Y')}<br>
# - Client: PGGB<br>
# - Warehouse: KECGBWH</p>
#
#
# <p>Best Regards,<br>
# KEC IT Team</p>
# </body>
# </html>"""
#
# # Ask user if they want to send email
# send_email = input("Need send email? Y/N: ")
#
# if send_email.upper() == 'Y':
#     # Send email with attachment
#     send_mail(
#         "crystal.jm.liang@kln.com",
#         ["crystal.jm.liang@kln.com", "Idyyan.Wingtse@kln.com","Dexter.Ling@kln.com","Niki.Yy.Li@kln.com","Whitney.WY.Chan@kln.com","zluxx@kln.com","Rex.JW.Zeng@kln.com"],
#
#         email_subject,
#         email_body,
#         [file_path]
#     )
#     print("Email sent successfully!")
# else:
#     print("Email sending skipped.")