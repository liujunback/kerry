
import unittest



from TWMS.properties.GetProperties import getProperties
from TWMS.public.Asn_Confirm import select_asn_id

from TWMS.public.TWMS_Login import Twms_login

class MyTestCase(unittest.TestCase):

    def test_case_order_create(self):

        company = "test"
        properties = getProperties(company)
        twms_login = Twms_login(properties)

        select_asn_id(properties, twms_login, asn_number)





if __name__ == '__main__':
    unittest.main()