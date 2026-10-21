package com.kec.wms.pda.data.model

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.AssignmentReturn
import androidx.compose.material.icons.filled.Warehouse
import androidx.compose.ui.graphics.vector.ImageVector
import com.kec.wms.pda.R
import com.kec.wms.pda.navigation.PdaRoutes

data class PdaModule(
    val id: String,
    @StringRes val titleRes: Int,
    val icon: ImageVector,
    val menuItems: List<MenuItem>
)

data class MenuItem(
    val id: String,
    @StringRes val titleRes: Int,
    @StringRes val descriptionRes: Int,
    val permissions: List<String>,
    val screen: String
)

object PdaMenuConfig {

    fun allModules(): List<PdaModule> = listOf(
        PdaModule(
            id = "inbound",
            titleRes = R.string.module_inbound,
            icon = Icons.Default.Inventory2,
            menuItems = listOf(
                MenuItem(
                    id = "asn_sign_in",
                    titleRes = R.string.menu_asn_sign_in,
                    descriptionRes = R.string.menu_desc_asn_sign_in,
                    permissions = listOf(Permission.ASN_SIGN_IN),
                    screen = PdaRoutes.ASN_SIGN_IN
                ),
                MenuItem(
                    id = "asn_receiving",
                    titleRes = R.string.menu_asn_receiving,
                    descriptionRes = R.string.menu_desc_asn_receiving,
                    permissions = listOf(Permission.RECEIVING_EXECUTE),
                    screen = PdaRoutes.ASN_SCAN
                ),
                MenuItem(
                    id = "putaway",
                    titleRes = R.string.menu_putaway,
                    descriptionRes = R.string.menu_desc_putaway,
                    permissions = listOf(
                        Permission.PUTAWAY_EXECUTE,
                        Permission.SHELVING_EXECUTE
                    ),
                    screen = PdaRoutes.PUTAWAY
                )
            )
        ),
        PdaModule(
            id = "returns",
            titleRes = R.string.module_returns,
            icon = Icons.Default.AssignmentReturn,
            menuItems = listOf(
                MenuItem(
                    id = "return_sign_in",
                    titleRes = R.string.menu_return_sign_in,
                    descriptionRes = R.string.menu_desc_return_sign_in,
                    permissions = listOf(Permission.RETURN_SIGN_IN),
                    screen = PdaRoutes.RETURN_SIGN_IN
                ),
                MenuItem(
                    id = "return_counting",
                    titleRes = R.string.menu_return_counting,
                    descriptionRes = R.string.menu_desc_return_counting,
                    permissions = listOf(Permission.RETURN_COUNT),
                    screen = PdaRoutes.RETURN_COUNTING
                ),
                MenuItem(
                    id = "return_putaway",
                    titleRes = R.string.menu_return_putaway,
                    descriptionRes = R.string.menu_desc_return_putaway,
                    permissions = listOf(Permission.RETURN_PUTAWAY_EXECUTE),
                    screen = PdaRoutes.RETURN_PUTAWAY
                )
            )
        ),
        PdaModule(
            id = "outbound",
            titleRes = R.string.module_outbound,
            icon = Icons.Default.LocalShipping,
            menuItems = listOf(
                MenuItem(
                    id = "picking",
                    titleRes = R.string.menu_picking,
                    descriptionRes = R.string.menu_desc_picking,
                    permissions = listOf(Permission.PICKING_EXECUTE),
                    screen = PdaRoutes.PICKING
                ),
                MenuItem(
                    id = "checking",
                    titleRes = R.string.menu_checking,
                    descriptionRes = R.string.menu_desc_checking,
                    permissions = listOf(Permission.PACKING_EXECUTE),
                    screen = PdaRoutes.CHECKING
                ),
                MenuItem(
                    id = "shipping",
                    titleRes = R.string.menu_shipping,
                    descriptionRes = R.string.menu_desc_shipping,
                    permissions = listOf(Permission.CHECKOUT_EXECUTE),
                    screen = PdaRoutes.SHIPPING
                ),
                MenuItem(
                    id = "manifest_mount",
                    titleRes = R.string.menu_manifest_mount,
                    descriptionRes = R.string.menu_desc_manifest_mount,
                    permissions = listOf(Permission.MANIFEST_MOUNT_EXECUTE),
                    screen = PdaRoutes.MANIFEST_MOUNT
                )
            )
        ),
        PdaModule(
            id = "inventory",
            titleRes = R.string.module_inventory,
            icon = Icons.Default.Warehouse,
            menuItems = listOf(
                MenuItem(
                    id = "cycle_count",
                    titleRes = R.string.menu_cycle_count,
                    descriptionRes = R.string.menu_desc_cycle_count,
                    permissions = listOf(Permission.INVENTORY_COUNT),
                    screen = PdaRoutes.CYCLE_COUNT
                ),
                MenuItem(
                    id = "transfer",
                    titleRes = R.string.menu_transfer,
                    descriptionRes = R.string.menu_desc_transfer,
                    permissions = listOf(Permission.INVENTORY_TRANSFER),
                    screen = PdaRoutes.TRANSFER
                ),
                MenuItem(
                    id = "inventory_query",
                    titleRes = R.string.menu_inventory_query,
                    descriptionRes = R.string.menu_desc_inventory_query,
                    permissions = listOf(Permission.INVENTORY_READ),
                    screen = PdaRoutes.INVENTORY_QUERY
                )
            )
        )
    )
}
