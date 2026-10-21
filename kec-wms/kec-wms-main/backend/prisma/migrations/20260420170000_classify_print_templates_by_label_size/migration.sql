UPDATE `print_template`
SET `label_type` = 'LABEL_60X40'
WHERE `label_type` IN ('BIN_LOCATION_LABEL', 'CONTAINER_LABEL', 'SKU_LABEL');

UPDATE `print_template`
SET `label_type` = 'LABEL_90X130'
WHERE `label_type` = 'PDA_LOGIN_QR';

UPDATE `print_template`
SET `label_type` = 'LABEL_100X150'
WHERE `label_type` = 'SERVICE_PROVIDER_LABEL';

UPDATE `print_template`
SET `label_type` = 'LABEL_150X100'
WHERE `label_type` = 'PUTAWAY_ORDER';

UPDATE `print_template`
SET `label_type` = 'A4_DOCUMENT'
WHERE `label_type` IN ('PICK_ORDER', 'WAVE_PICK_LIST', 'MANIFEST_ORDER', 'PACKING_LIST', 'INVOICE');

UPDATE `print_history`
SET `label_type` = 'LABEL_60X40'
WHERE `label_type` IN ('BIN_LOCATION_LABEL', 'CONTAINER_LABEL', 'SKU_LABEL');

UPDATE `print_history`
SET `label_type` = 'LABEL_90X130'
WHERE `label_type` = 'PDA_LOGIN_QR';

UPDATE `print_history`
SET `label_type` = 'LABEL_100X150'
WHERE `label_type` = 'SERVICE_PROVIDER_LABEL';

UPDATE `print_history`
SET `label_type` = 'LABEL_150X100'
WHERE `label_type` = 'PUTAWAY_ORDER';

UPDATE `print_history`
SET `label_type` = 'A4_DOCUMENT'
WHERE `label_type` IN ('PICK_ORDER', 'WAVE_PICK_LIST', 'MANIFEST_ORDER', 'PACKING_LIST', 'INVOICE');
