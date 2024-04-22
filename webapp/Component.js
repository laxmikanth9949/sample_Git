/*jQuery.sap.registerModulePath("sap.coe.capacity.reuselib", "/reuselib/src/sap/coe/capacity/reuselib/");*/
sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/support/boost/model/models"
], function (UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("sap.support.boost.Component", {

		metadata: {
			manifest: "json"
		},
		/*"config": {
			"fullWidth": true,
			"reportingId": "c1b38672-46e5-47ba-ba3b-f27ac18d1f7c"
		},*/

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			this.setModel(models.createUserModel(), "userModel");

			/* Mobile Usage Reporting */
			/* Version v3 */
			sap.git = sap.git || {}, sap.git.usage = sap.git.usage || {}, sap.git.usage.Reporting = {
				_lp: null,
				_load: function (a) {
					this._lp = this._lp || sap.ui.getCore().loadLibrary("sap.git.usage", {
						url: "https://trackingshallwe.hana.ondemand.com/web-client/v3",
						async: !0
					}), this._lp.then(function () {
						a(sap.git.usage.MobileUsageReporting)
					}, this._loadFailed)
				},
				_loadFailed: function (a) {
					jQuery.sap.log.warning("[sap.git.usage.MobileUsageReporting]", "Loading failed: " + a)
				},
				setup: function (a) {
					this._load(function (b) {
						b.setup(a)
					})
				},
				addEvent: function (a, b) {
					this._load(function (c) {
						c.addEvent(a, b)
					})
				},
				setUser: function (a, b) {
					this._load(function (c) {
						c.setUser(a, b)
					})
				}
			};

			sap.git.usage.Reporting.setup(this);

			sap.ui.getCore().getConfiguration().setLanguage("en-gb");

			this.initODataModel();

			this.setTimeoutInterval();
		},
		initODataModel: function () {
			sap.support.boost.ISModel = new sap.ui.model.odata.v2.ODataModel({
				json: true,
				useBatch: false,
				serviceUrl: "/" + "intis/sap/ZSTAFFING_APP_2_SRV",
				defaultUpdateMethod: "Put"
			});
				sap.support.boost.ISModel = new sap.ui.model.odata.v2.ODataModel({
				json: true,
				useBatch: false,
				serviceUrl: "/" + "sap/opu/odata/sap/ZS_AGS_FSC2_SRV",
				defaultUpdateMethod: "Put"
			});
			
			//--------------cimRequest
			//--------service now
			sap.support.boost.servicenowEscalationUrl = "/" + "servicenow/api/now/table/sn_customerservice_escalation";
			sap.support.boost.servicenowEscalationUrlCreateApi = "/" + "servicenow/api/now/import/u_sap_escalation_api_inbound";
			sap.support.boost.servicenowEscalationNotesUrl = "/" + "servicenow/api/sapda/sap_escalation_activity";
			sap.support.boost.servicenowEscalationByCustomerUrl = "/" + "servicenow/api/now/table/sn_customerservice_escalation_case_account";

			sap.support.boost.servicenowUrl = "/" + "servicenow/api/now/table/sn_customerservice_case";
			sap.support.boost.snowBusImpUrl = "/" + "servicenow/api/x_sapda_case_api/case_detail";
			sap.support.boost.postServicenowUrl = "/" + "servicenow/api/now/import/x_sapda_sap_icp_ap_task_update";
			//--------service now

			this.getModel("resReq").read("/ResServiceTeamSet", {});
			this.getModel("default").read("/ResAuthCheckSet", {
				success: function(oResponce){
					var auth = oResponce.results[0].Authorized;
					this.getModel("Auth").setProperty("/authorization", auth);
				}.bind(this),
				error: function(oResponce){
					sap.m.MessageToast.show("You have been not authorized..! Try to refresh the app or contact to admin");
				}.bind(this)
			});

		},
		// make a request to the server every 15 minutes
		setTimeoutInterval: function (app) {
			/*	var url = "https://fiorilaunchpad.sap.com/sap/fiori/boost/webapp/Component-preload.js"; //Prod
				var currentUrl = window.location.href;
				if (currentUrl.includes("fiorilaunchpad.sap.com")) {
					Unknownmacro: {
						url = "https://fiorilaunchpad.sap.com/sap/fiori/boost/sap/opu/odata/sap/ZS_BACKOFFICE_STAFFING_SRV";
					}
				}
				else if (currentUrl.includes("fiorilaunchpad-sapitcloudt")) {
					Unknownmacro: {
						url =
						"https://fiorilaunchpad-sapitcloudt.dispatcher.hana.ondemand.com/sap/fiori/boost/sap/opu/odata/sap/ZS_BACKOFFICE_STAFFING_SRV/";
					}
				}
				else if (currentUrl.includes("br339jmc4c"))
					Unknownmacro: {
						url = window.location.origin + "~1614707399000~/webapp/Component.js"; //WebIDE
					}*/
			var that = this;
			setInterval(function () {
				that.initODataModel();
			}, 900000); //15 minutes
		}

	});
});