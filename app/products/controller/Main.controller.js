sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("com.sap.mock.products.controller.Main", {

        formatter: formatter,

        onInit: function () {
            const oViewModel = new JSONModel({
                busy: false,
                delay: 0
            });
            this.getView().setModel(oViewModel, "view");
        },

        onRefresh: function () {
            const oBinding = this.byId("productsTable").getBinding("items");
            if (oBinding) {
                oBinding.refresh();
                MessageToast.show(this.getResourceBundle().getText("refreshSuccess"));
            }
        },

        onSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query");
            const oTable = this.byId("productsTable");
            const oBinding = oTable.getBinding("items");

            if (oBinding) {
                const aFilters = [];
                if (sQuery) {
                    aFilters.push(new Filter({
                        filters: [
                            new Filter("name", FilterOperator.Contains, sQuery),
                            new Filter("description", FilterOperator.Contains, sQuery)
                        ],
                        and: false
                    }));
                }
                oBinding.filter(aFilters);
            }
        },

        onFilterCategory: function (oEvent) {
            const sCategory = oEvent.getParameter("selectedItem")?.getKey();
            const oTable = this.byId("productsTable");
            const oBinding = oTable.getBinding("items");

            if (oBinding) {
                const aFilters = [];
                if (sCategory) {
                    aFilters.push(new Filter("category_ID", FilterOperator.EQ, sCategory));
                }
                oBinding.filter(aFilters);
            }
        },

        onSelectionChange: function (oEvent) {
            const oItem = oEvent.getParameter("listItem");
            const oContext = oItem.getBindingContext();
            const sProductId = oContext.getProperty("ID");

            this.getRouter().navTo("RouteDetail", {
                productId: sProductId
            });
        },

        onProductPress: function (oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sProductId = oContext.getProperty("ID");

            this.getRouter().navTo("RouteDetail", {
                productId: sProductId
            });
        },

        onCreateProduct: function () {
            MessageBox.information("Create product dialog would open here");
            // In a real app, open a dialog with a form
        },

        onEditProduct: function (oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext();
            const sProductName = oContext.getProperty("name");

            MessageBox.information(`Edit product: ${sProductName}`);
            // In a real app, open edit dialog
        },

        onDeleteProduct: function (oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext();
            const sProductName = oContext.getProperty("name");
            const sProductId = oContext.getProperty("ID");

            MessageBox.confirm(
                `Are you sure you want to delete ${sProductName}?`,
                {
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK) {
                            this._deleteProduct(sProductId, sProductName);
                        }
                    }
                }
            );
        },

        _deleteProduct: function (sId, sName) {
            const oModel = this.getView().getModel();
            const sPath = oModel.createKey("/Products", { ID: sId });

            oModel.remove(sPath, {
                success: () => {
                    MessageToast.show(`Product ${sName} deleted successfully`);
                    this.onRefresh();
                },
                error: (oError) => {
                    MessageBox.error(`Failed to delete product: ${oError.message}`);
                }
            });
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});
