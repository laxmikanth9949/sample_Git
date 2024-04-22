sap.ui.define([
	"sap/support/boost/controller/BaseController",
	"sap/support/boost/model/formatter",
	'sap/ui/model/json/JSONModel'
], function (BaseController, formatter, JSONModel) {
	"use strict";

	return BaseController.extend("sap.support.boost.controller.dtmngr", {
		formatter: formatter,
		onInit: function () {
			// this.handleDTMNStaffing();
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("app", "getDTMNStaffingDate", this.handleDTMNStaffing, this);
			this.getRouter().getRoute("dtmngr").attachPatternMatched(this._onRouteMatched, this);
		},
		_onRouteMatched: function () {
			this.getModel("selectedKey").setProperty("/page", "dutyManager");
			this.handleDTMNStaffing();
		},
		handleDTMNStaffing: function () {
			this.getView().setBusy(true);
			var startDate = this.getModel("datePick").getProperty("/date");
			startDate = formatter.fnSetStartWeek(startDate);

			var endDate = formatter.fnSetDateAhead(startDate, 0, 7);

			var sDate = formatter.fnParseDate(startDate);
			var eDate = formatter.fnParseDate(endDate);

			var oHeaderData = this.getHeaderData(startDate);
			this.setHeaderModel(oHeaderData);

			var oStaffData = this.getStaffingData(sDate, eDate, startDate, endDate);
			this.setStaffingModel(oStaffData);

		},
		setHeaderModel: function (oHeaderData) {
			var oHeaderModel = new JSONModel();
			oHeaderModel.setData(oHeaderData);
			var oDTMNHeaderRow = this.getView().byId("Boost.view.dtmngr.Layout.H1");
			oDTMNHeaderRow.setModel(oHeaderModel, "StaffDTMNHeaderModel");
		},

		setStaffingModel: function (oScheduleStaff) {
			var oScheduleStaffModel = new JSONModel();
			oScheduleStaffModel.setData(oScheduleStaff);
			var oDTMNStaffRow = this.getView().byId("Boost.view.dtmngr.Layout");
			oDTMNStaffRow.setModel(oScheduleStaffModel, "StaffDTMNStaffModel2");
			this.getView().setBusy(false);
		},
		getHeaderData: function (startDate) {
			var aDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
			var oScheduleHeader = {}; // Start the skeleton

			oScheduleHeader["content"] = [];
			oScheduleHeader["content"][0] = {};
			oScheduleHeader["content"][0]["members"] = [];
			oScheduleHeader["content"][0]["members"][0] = {};
			oScheduleHeader["content"][0]["members"][0] = {
				weekHeader: true,
				members: new Array()
			};
			oScheduleHeader["content"][0]["members"][0]["members"][0] = { // Blank slot
				isSelected: false,
				dayDate: "",
				date: "",
				isServiceOrder: false,
				isPHoliday: false
			};
			var oDate = new Date(startDate);
			for (var iDayNum = 1; iDayNum < 8; iDayNum++) {
				var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "dd MMMM"
				});
				var formatedDate = oDateFormat.format(oDate);
				// Prepare Header for weekly view
				oScheduleHeader["content"][0]["members"][0]["members"][iDayNum] = {
					isSelected: true,
					dayDate: formatedDate,
					date: aDayNames[iDayNum - 1],
					isServiceOrder: false,
					isPHoliday: false
				};
				oDate.setDate(oDate.getDate() + 1); // Increment to next Date
			}
			return oScheduleHeader.content[0];
		},

		getStaffingData: function (sDate, eDate, startDate, endDate) {
			var oScheduleStaff = {}; // Start the skeleton

			oScheduleStaff["content"] = [];
			oScheduleStaff["content"][0] = {};
			oScheduleStaff["content"][0]["members"] = [];
			oScheduleStaff["content"][0]["members"][0] = {};

			for (var iCount = 0; iCount < 3; iCount++) {
				oScheduleStaff["content"][0]["members"][iCount] = {
					weekHeader: true,
					members: new Array()
				};
			}
			oScheduleStaff["content"][0]["members"][0]["members"][0] = { // APJ row
				isSelected: false,
				dayDate: "",
				date: "Duty Manager APJ",
				isServiceOrder: false,
				isPHoliday: false,
				members: [{
					firstName: "Duty Manager APJ"
				}]
			};
			oScheduleStaff["content"][0]["members"][1]["members"][0] = { // EMEA row
				isSelected: false,
				dayDate: "",
				date: "Duty Manager EMEA",
				isServiceOrder: false,
				isPHoliday: false,
				members: [{
					firstName: "Duty Manager EMEA"
				}]
			};
			oScheduleStaff["content"][0]["members"][2]["members"][0] = { // US row
				isSelected: false,
				dayDate: "",
				date: "Duty Manager US",
				isServiceOrder: false,
				isPHoliday: false,
				members: [{
					firstName: "Duty Manager US"
				}]
			};
			//read staffdate from back-end
			var oDateTimeStaffBeg = formatter.dateFormatChange(sDate);
			var oDateTimeStaffEnd = formatter.dateFormatChange(eDate);
			/*var aUrlParamEMEA = ["$filter=Date ge'" + sDate + "' and Date le'" + eDate + "' and Team_Id eq 'Control Center' and Region eq 'EMEA'"];
			oServiceModel.read("/Staffing", null, aUrlParamEMEA, false, fnStaffReadSucc, fnStaffReadFail);
			var aUrlParamAPJ =  ["$filter=Date ge'" + sDate + "' and Date le'" + eDate + "' and Team_Id eq 'Control Center' and Region eq 'APJ'"];
			oServiceModel.read("/Staffing", null, aUrlParamAPJ, false, fnStaffReadSucc, fnStaffReadFail);
			var aUrlParamUS =   ["$filter=Date ge'" + sDate + "' and Date le'" + eDate + "' and Team_Id eq 'Control Center' and Region eq 'US'"];
			oServiceModel.read("/Staffing", null, aUrlParamUS, false, fnStaffReadSucc, fnStaffReadFail);*/
		/*	var aUrlParamEMEA = ["$filter=Date ge " + oDateTimeStaffBeg + " and Date le " + oDateTimeStaffEnd +
				" and Team_Id eq 'Control Center' and Region eq 'EMEA BACKOFFICE' and Page eq 'Dutymanager'"
			];
			var aUrlParamAPJ = ["$filter=Date ge " + oDateTimeStaffBeg + " and Date le " + oDateTimeStaffEnd +
				" and Team_Id eq 'Control Center' and Region eq 'APJ GCN BACKOFFICE' and Page eq 'Dutymanager'"
			];
			var aUrlParamUS = ["$filter=Date ge " + oDateTimeStaffBeg + " and Date le " + oDateTimeStaffEnd +
				" and Team_Id eq 'Control Center' and Region eq 'NA BACKOFFICE' and Page eq 'Dutymanager'"
			];*/
			
			// removed team id's in url parameters c5288613
			var aUrlParamEMEA = ["$filter=Date ge " + oDateTimeStaffBeg + " and Date le " + oDateTimeStaffEnd +
				" and Region eq 'EMEA BACKOFFICE' and Page eq 'Dutymanager'"
			];
			var aUrlParamAPJ = ["$filter=Date ge " + oDateTimeStaffBeg + " and Date le " + oDateTimeStaffEnd +
				" and Region eq 'APJ GCN BACKOFFICE' and Page eq 'Dutymanager'"
			];
			var aUrlParamUS = ["$filter=Date ge " + oDateTimeStaffBeg + " and Date le " + oDateTimeStaffEnd +
				" and Region eq 'NA BACKOFFICE' and Page eq 'Dutymanager'"
			];
			
			//TODO: mock 3 staffing

			var aEMEAResults = [],
				aAPJResults = [],
				aUSResults = [];
			var sUrlEMEA = "/sap/opu/odata/sap/ZS_BACKOFFICE_STAFFING_SRV/Staffing?" + aUrlParamEMEA;
			jQuery.ajax({
				async: false,
				url: sUrlEMEA,
				type: "GET",
				dataType: "json",
				success: function (oData) {
					aEMEAResults = oData.d.results;
				}
			});

			var sUrlAPJ = "/sap/opu/odata/sap/ZS_BACKOFFICE_STAFFING_SRV/Staffing?" + aUrlParamAPJ;
			jQuery.ajax({
				async: false,
				url: sUrlAPJ,
				type: "GET",
				dataType: "json",
				success: function (oData) {
					aAPJResults = oData.d.results;
				}
			});

			var sUrlUS = "/sap/opu/odata/sap/ZS_BACKOFFICE_STAFFING_SRV/Staffing?" + aUrlParamUS;
			jQuery.ajax({
				async: false,
				url: sUrlUS,
				type: "GET",
				dataType: "json",
				success: function (oData) {
					aUSResults = oData.d.results;
				}
			});
			// this.oEMEAModel = new JSONModel();
			// this.oEMEAModel.loadData(sap.ui.require.toUrl("sap/support/boost/localService/mockdata/Staffing_EMEA.json"), {}, false, "GET");
			// var aEMEAResults = this.oEMEAModel.getData().d.results;
			// this.oAPJModel = new JSONModel();
			// this.oAPJModel.loadData(sap.ui.require.toUrl("sap/support/boost/localService/mockdata/Staffing_APJ.json"), {}, false, "GET");
			// var aAPJResults = this.oAPJModel.getData().d.results;
			// this.oUSModel = new JSONModel();
			// this.oUSModel.loadData(sap.ui.require.toUrl("sap/support/boost/localService/mockdata/Staffing_US.json"), {}, false, "GET");
			// var aUSResults = this.oUSModel.getData().d.results;
			var allResults = [];
			if (aEMEAResults.length > 0) {
				allResults = allResults.concat(aEMEAResults);
			}
			if (aAPJResults.length > 0) {
				allResults = allResults.concat(aAPJResults);
			}
			if (aUSResults.length > 0) {
				allResults = allResults.concat(aUSResults);
			}
			// filter all the staffing data
			/*allResults = allResults.filter(function (item) {
				return (item.Assignmentstartdate !== null &&
					formatter.fnParseDate(new Date(Number(item.Assignmentstartdate.split("(")[1].split(")")[0]))) <= formatter.fnParseDate(new Date(
						Number(item.Date.split("(")[1].split(")")[0]))) &&
					formatter.fnParseDate(new Date(Number(item.Assignmentenddate.split("(")[1].split(")")[0]))) >= formatter.fnParseDate(new Date(
						Number(item.Date.split("(")[1].split(")")[0])))
				);
			});*/
			return this.fnStaffReadSucc2(allResults, startDate, oScheduleStaff);
		},

		fnStaffReadSucc2: function (oData, startDate, oScheduleStaff) {
			var aResults = oData;
			var date = startDate;

			for (var iDay = 1; iDay < 8; iDay++) {
				var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "dd MMMM"
				});
				var formatedDate = oDateFormat.format(date);

				var compareDate = formatter.fnParseDateCompare(date);

				oScheduleStaff["content"][0]["members"][0]["members"][iDay] = { // APJ
					isSelected: false,
					dayDate: formatedDate,
					date: date,
					isServiceOrder: true,
					isPHoliday: false,
					members: new Array()
				};
				oScheduleStaff["content"][0]["members"][1]["members"][iDay] = { // EMEA
					isSelected: false,
					dayDate: formatedDate,
					date: date,
					isServiceOrder: true,
					isPHoliday: false,
					members: new Array()
				};
				oScheduleStaff["content"][0]["members"][2]["members"][iDay] = { // US
					isSelected: false,
					dayDate: formatedDate,
					date: date,
					isServiceOrder: true,
					isPHoliday: false,
					members: new Array()
				};

				for (var iCount = 0, iLength = aResults.length; iCount < iLength; iCount++) {
					var sDate = aResults[iCount].Date;
					sDate = new Date(Number(sDate.split("(")[1].split(")")[0])); // TODO: remove this when use real service
					sDate = formatter.removeTimeOffset(sDate);
					sDate = formatter.fnParseDateCompare(sDate);
					var sRole = aResults[iCount].Role;
					var sId = aResults[iCount].Employee_Id;
					var sEmail = aResults[iCount].Email_Address;

					var iRegion = 5;
					var sRegion = aResults[iCount].Region;
					if (sRegion === "APJ GCN BACKOFFICE") {
						iRegion = 0;
					} else if (sRegion === "EMEA BACKOFFICE") {
						iRegion = 1;
					} else if (sRegion === "NA BACKOFFICE") {
						iRegion = 2;
					}
					/*else if(sRegion === "LA"){
					               iRegion = 4;
					             }*/
					if (sRole.indexOf("Duty Manager") !== -1 && compareDate === sDate && sEmail && iRegion !== 5) {
						oScheduleStaff["content"][0]["members"][iRegion]["members"][iDay]["members"].push({
							employeeId: aResults[iCount].Employee_Id,
							firstName: aResults[iCount].First_Name,
							lastName: aResults[iCount].Last_Name,
							mobile: aResults[iCount].Mobile_Number,
							tel: aResults[iCount].Phone_Number,
							mailto: aResults[iCount].Email_Address,
							deskLocation: aResults[iCount].DeskLocation,
							role: aResults[iCount].Role,
							serviceOrder: aResults[iCount].Service_Order_Id,
							serviceItem: aResults[iCount].Service_Item_Id,
							note: aResults[iCount].Note
						});
					} else if (sRole.indexOf("Duty Manager") !== -1 && compareDate === sDate && iRegion !== 5) {
						oScheduleStaff["content"][0]["members"][iRegion]["members"][iDay]["members"].push({
							firstName: "Slot Empty",
							lastName: "",
							role: aResults[iCount].Role,
							serviceOrder: aResults[iCount].Service_Order_Id,
							serviceItem: aResults[iCount].Service_Item_Id
						});
					}
				}
				//If no members exist in a day cell, this means there is nobody staffed
				if (oScheduleStaff["content"][0]["members"][0]["members"][iDay]["members"].length === 0) {
					oScheduleStaff["content"][0]["members"][0]["members"][iDay]["isServiceOrder"] = false;
					oScheduleStaff["content"][0]["members"][0]["members"][iDay]["serviceError"] =
						"Duty Manager Staffing has not been created for this time frame. Please contact SAP Escalation.";
					oScheduleStaff["content"][0]["members"][0]["members"][iDay]["noStaffing"] = true;
				}
				if (oScheduleStaff["content"][0]["members"][1]["members"][iDay]["members"].length === 0) {
					oScheduleStaff["content"][0]["members"][1]["members"][iDay]["isServiceOrder"] = false;
					oScheduleStaff["content"][0]["members"][1]["members"][iDay]["serviceError"] =
						"Duty Manager Staffing has not been created for this time frame. Please contact SAP Escalation.";
					oScheduleStaff["content"][0]["members"][1]["members"][iDay]["noStaffing"] = true;
				}
				if (oScheduleStaff["content"][0]["members"][2]["members"][iDay]["members"].length === 0) {
					oScheduleStaff["content"][0]["members"][2]["members"][iDay]["isServiceOrder"] = false;
					oScheduleStaff["content"][0]["members"][2]["members"][iDay]["serviceError"] =
						"Duty Manager Staffing has not been created for this time frame. Please contact SAP Escalation.";
					oScheduleStaff["content"][0]["members"][2]["members"][iDay]["noStaffing"] = true;
				}
				date.setDate(date.getDate() + 1); // Increment to next Date
			}

			return oScheduleStaff.content[0];
		}

	});
});