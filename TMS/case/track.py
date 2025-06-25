import time

from TMS.ICBU.status import status
from TMS.public.Mawb import create, scan_box, close_mawb
from TMS.public.check_weight import check_weight
from TMS.public.close_box_scan import close_Box_Scan,close_Box
from TMS.public.Inbaound import inbound
from TMS.public.shipment import shipment_add, shipment_scan, shipment_close



def track():
    tracking_number=""
    box_num = "TH1222010000002M"
    # inbound(tracking_number)
    # box_num = close_Box_Scan(tracking_number)
    # close_Box(box_num,[tracking_number])
    # time.sleep(10)
    # check_weight(box_num,[tracking_number])
    shipment_num = shipment_add()
    # time.sleep(10)
    shipmentbatchId = shipment_scan(box_num,shipment_num)
    shipment_close(shipmentbatchId,shipment_num)
    mawb_data = create()
    time.sleep(1)

    scan_box(box_num,mawb_data["mawb"],mawb_data["id"])
    close_mawb(mawb_data["mawb"],mawb_data["id"])



    # status(tracking_number,"OQ","import_customs_clearance_success")#606
    # time.sleep(5)
    # status(tracking_number,"OG","import_customs_clearance_on_hold")#18
    # time.sleep(5)
    # status(tracking_number,"OE","import_customs_clearance_released")#605
    # time.sleep(5)
    # status(tracking_number,"OP","import_customs_repacking")#668
    # time.sleep(5)
    #
    # status(tracking_number,"OHT","import_customs_handover_to_truck")#30
    # time.sleep(5)
    # status(tracking_number,"SP","lastmile_first_delivery_attempt")#204
    # time.sleep(5)
    # status(tracking_number,"OK","lastmile_delivered")#80
    # time.sleep(5)
    # status(tracking_number,"LS","lost")#8000
    # time.sleep(5)
    # status(tracking_number,"DM","damage")#33
    # time.sleep(5)
    # status(tracking_number,"XH","scrapped")#70
    # time.sleep(5)


track()