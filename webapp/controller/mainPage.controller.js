sap.ui.define([
	"sap/support/boost/controller/BaseController",
	"sap/support/boost/model/formatter"
], function (BaseController, formatter) {
	"use strict";

	return BaseController.extend("sap.support.boost.controller.mainPage", {

		_viewSelected: 1,
		formatter: formatter,
		onInit: function () {
			this.getModel("datePick").setProperty("/", {
				"date": new Date()
			});
			// initial page is day
			this.getModel("Config").setProperty("/region", true);
			this.getModel("Config").setProperty("/team", false);
			this.getModel("selectedKey").setProperty("/region", "EMEA");
			this.getModel("selectedKey").setProperty("/team", "Control Center");
			
			this.getRegions();
			this.getTeams();
			
		},

		getRegions: function () {
			var sFullDate = this.getModel("datePick").getProperty("/date");
			var oDateTimeRegions = formatter.dateFormatChange(sFullDate);
			oDateTimeRegions = "datetime'2020-02-26T00:00:00'";// for Mock Server
			var aURLParam = ["$filter= Date eq " + oDateTimeRegions];
			this.getModel().read("/Regions", {
				urlParameters: aURLParam,
				success: function (oData) {
					this.getModel("Regions").setData(oData.results);
					this.getModel("selectedKey").setProperty("/region", "EMEA");
				}.bind(this)
			});
		},
		
		getTeams: function () {
			var oFullDate = this.getModel("datePick").getProperty("/date");
			var oDate = new Date(oFullDate.getTime());
			oDate.setMonth(oDate.getMonth() - 1);
			var oDateTimeTeamsBeg = formatter.dateFormatChange(oDate);
			var oDateTimeTeamsEnd = formatter.dateFormatChange(oFullDate);
			oDateTimeTeamsBeg = "datetime'2020-01-26T00:00:00'";
			oDateTimeTeamsEnd ="datetime'2020-02-26T00:00:00'";
			var sRegion = this.getModel("selectedKey").getProperty("/region");
			var aURLParam = ["$filter= Date ge " + oDateTimeTeamsBeg + " and " + "Date le " + oDateTimeTeamsEnd + " and " + " Region eq '" +
				sRegion + "'", "$orderby=Team_Id"
			];
			this.getModel().read("/Teams", {
				urlParameters: aURLParam,
				success: function (oData) {
					this.getModel("Teams").setData(oData.results);
					this.getModel("selectedKey").setProperty("/team", "Control Center");
					//this.getModel("selectedKey").setProperty("/team", oData.results[0].Team_Id);
				}.bind(this)
			});
		},
		
		handleRegionChange: function(){
			this.getTeams();
			var oPage = this.getView().byId("day");
			oPage.getController().getDayStaffing();
		},
		
		handleDatePickerChange: function(){
			this.getTeams();
		},
		
		/*onDay: function(){
			this.getModel("Config").setProperty("/region", true);
			this.getModel("Config").setProperty("/team", false);
		},
		
		onMonth: function(){
			this.getModel("Config").setProperty("/region", true);
			this.getModel("Config").setProperty("/team", true);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("month");
			
		},
		
		onDutyManager: function(){
			this.getModel("Config").setProperty("/region", false);
			this.getModel("Config").setProperty("/team", false);
		},*/
		
		calPrev: function () {
			var self = this;

			var oDatePicker = this.byId("DP1");

			var oDate = null;
			if (self._viewSelected === 1) { // Iterate one day
				oDate = this.byId("DP1").getDateValue();
				oDate.setDate(oDate.getDate() - 1);
				oDatePicker.setDateValue(oDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			} else if (self._viewSelected === 2) { // Iterate month
				this.getTeams();
				oDate = sap.ui.getCore().byId("DP1").getDateValue();
				var oTargetDate = Formatter.fnSetDatePast(oDate, 1, 0);
				oDatePicker.setDateValue(oTargetDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			} else if (self._viewSelected === 3) { // Iterate week
				oDate = sap.ui.getCore().byId("DP1").getDateValue();
				var oTargetDate = Formatter.fnSetStartWeek(oDate);
				oTargetDate = Formatter.fnSetDatePast(oTargetDate, 0, 7);
				oDatePicker.setDateValue(oTargetDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			}
		},

		calNext: function () {
			var self = this;
			var oDatePicker = this.byId("DP1");
			var oDate = null;
			if (self._viewSelected === 1) {
				oDate = this.byId("DP1").getDateValue();
				oDate.setDate(oDate.getDate() + 1);
				oDatePicker.setDateValue(oDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			} else if (self._viewSelected === 2) {
				this.getTeams();
				oDate = sap.ui.getCore().byId("DP1").getDateValue();
				var oTargetDate = Formatter.fnSetDateAhead(oDate, 1, 0);
				oDatePicker.setDateValue(oTargetDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			} else if (self._viewSelected === 3) {
				oDate = sap.ui.getCore().byId("DP1").getDateValue();
				var oTargetDate = Formatter.fnSetStartWeek(oDate);
				oTargetDate = Formatter.fnSetDateAhead(oTargetDate, 0, 7);
				oDatePicker.setDateValue(oTargetDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			}
		}

	});
});