sap.ui.define([
	"sap/support/boost/controller/BaseController",
	"sap/support/boost/model/formatter",
	'sap/ui/model/json/JSONModel'
], function (BaseController, formatter, JSONModel) {
	"use strict";

	return BaseController.extend("sap.support.boost.controller.month", {
		formatter: formatter,
		onInit: function () {
			// this.handleMonthStaffing();
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("app", "getMonthStaffingDate", this.handleMonthStaffing, this);
			this.getRouter().getRoute("month").attachPatternMatched(this._onRouteMatched, this);
		},
		_onRouteMatched:function(){
			this.getModel("selectedKey").setProperty("/page", "month");
			this.handleMonthStaffing();
		},
		handleMonthStaffing: function () {
			this.getView().setBusy(true);
			var startDate = this.getModel("datePick").getProperty("/date");
			startDate = formatter.fnSetStartMonth(startDate);

			var endDate = new Date();
			endDate = formatter.fnSetDateAhead(startDate, 1, 7);

			startDate = formatter.fnSetStartWeek(startDate);
			endDate = formatter.fnSetEndWeek(endDate);

			var sDate = formatter.fnParseDate(startDate);
			var eDate = formatter.fnParseDate(endDate);

			var sRegion = this.getModel("selectedKey").getProperty("/region");
			if(!sRegion){
				sRegion = this.getModel("Regions").getProperty("/0/Region");
			}
			var sTeam = this.getModel("selectedKey").getProperty("/team");
			if(!sTeam){
				//sTeam = this.getModel("Teams").getProperty("/0/Team_Id");
				sTeam = "Control Center";
			}
			// -------getTeams data-----//
			var oDateTimePHBeg = formatter.dateFormatChange(sDate);
			var oDateTimePHEnd = formatter.dateFormatChange(eDate);
			//var aURLParam = ["$filter= Date ge '" + sDate +  "' and " + "Date le '" + eDate +"' and "+" Region eq '" + sRegion +"'"];
			var aURLParam = ["$filter= Date ge " + oDateTimePHBeg + " and " + "Date le " + oDateTimePHEnd + " and " + " Region eq '" + sRegion +
				"'"
			];
			var aHolResults = new Array();
			this.getModel("default").read("/Teams", {
				urlParameters: aURLParam,
				async: false,
				success: function (oData) {
					aHolResults = oData.results;
					this.getModel("selectedKey").setProperty("/region", sRegion);
					this.setMonthMatrixData(startDate, endDate, sDate, eDate, aHolResults, sRegion, sTeam);
				}.bind(this)
			});
		},
		/*getPublicHolidays: function (sDate, eDate, sRegion) {
			var oDateTimePHBeg = formatter.dateFormatChange(sDate);
			var oDateTimePHEnd = formatter.dateFormatChange(eDate);
			//var aURLParam = ["$filter= Date ge '" + sDate +  "' and " + "Date le '" + eDate +"' and "+" Region eq '" + sRegion +"'"];
			var aURLParam = ["$filter= Date ge " + oDateTimePHBeg + " and " + "Date le " + oDateTimePHEnd + " and " + " Region eq '" + sRegion +
				"'"
			];
			var aHolResults = new Array();
			this.getModel().read("/Teams", {
				urlParameters: aURLParam,
				async: false,
				success: function (oData) {
					aHolResults = oData.results;
					this.getModel("selectedKey").setProperty("/region", sRegion);
				}.bind(this)
			});
		},*/
		setMonthMatrixData: function (startDate, endDate, sDate, eDate, aHolResults, sRegion, sTeam) {
			var oMonthHeaderData = this.getMonthHeaderData();
			var oMonthHeaderModel = new JSONModel();
			oMonthHeaderModel.setData(oMonthHeaderData);
			var oMonthHeaderRow = this.getView().byId("Boost.view.month.Layout.H");
			oMonthHeaderRow.setModel(oMonthHeaderModel, "StaffMonthHeaderModel");

			this.getStaffingAndSetModel(startDate, endDate, sDate, eDate, aHolResults, sRegion, sTeam);
		},

		getMonthHeaderData: function () {
			var aDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
			var oMonthHeaderData = {}; // Start the skeleton
			oMonthHeaderData["content"] = new Array();
			oMonthHeaderData["content"][0] = {};
			oMonthHeaderData["content"][0]["members"] = new Array();
			oMonthHeaderData["content"][0]["members"][0] = {};
			oMonthHeaderData["content"][0]["members"][0] = {
				weekHeader: true,
				members: new Array()
			};

			for (var iDayNum = 0; iDayNum < 7; iDayNum++) { // Prepare Header for monthly view
				oMonthHeaderData["content"][0]["members"][0]["members"][iDayNum] = {
					isSelected: false,
					dayDate: "",
					date: aDayNames[iDayNum],
					isServiceOrder: false,
					isPHoliday: false,
					isStaffing: true,
				};
			}

			return oMonthHeaderData.content[0];
		},

		getStaffingAndSetModel: function (startDate, endDate, sDate, eDate, aHolidayResults, sRegion, sTeam) { //TODO: move args into array
			var iWeeks = formatter.fnNumberOfWeeks(startDate, endDate);
			var oScheduleStaff = {}; // Start the skeleton
			oScheduleStaff["content"] = new Array();
			oScheduleStaff["content"][0] = {};
			oScheduleStaff["content"][0]["members"] = new Array();
			oScheduleStaff["content"][0]["members"][0] = {};
			oScheduleStaff["content"][0]["members"][0] = {
				weekHeader: true,
				members: new Array()
			};
			var that = this;
			function fnStaffReadSucc(aResults) {
				//var aResults = oData.results;
				var date = startDate;
				var sSelectedTeam = that.getModel("selectedKey").getProperty("/team");

				for (var iWeekCount = 0; iWeekCount < iWeeks - 1; iWeekCount++) { // Insert values into skeleton, plus one week to account for the header
					oScheduleStaff["content"][0]["members"][iWeekCount] = { // Insert days into a week
						weekHeader: false,
						members: new Array()
					};
					for (var iDayCount = 0; iDayCount < 7; iDayCount++) {
						var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
							pattern: "dd MMMM"
						});
						var formatedDate = oDateFormat.format(date);

						var compareDate = formatter.fnParseDateCompare(date);
						var bHil = false,
							sHolShort = null,
							sHolLong = null;
						for (var iCount = 0, iLength = aHolidayResults.length; iCount < iLength; iCount++) { // Process public holidays
							var sHolDate = aHolidayResults[iCount].Date;
							var sHolTeam = aHolidayResults[iCount].Team_Id;
							var sIsHoliday = aHolidayResults[iCount].Is_Holiday;
							var sX = "X";
							if (sHolDate === compareDate && sHolTeam === sSelectedTeam && sX === sIsHoliday) { // If dates, team_id and isHoliday match, insert holiday info
								bHil = true;
								sHolShort = aHolidayResults[iCount].Holiday_Text_Short;
								sHolLong = aHolidayResults[iCount].Holiday_Text_Long;
								break; // If found the holiday then exit
							}
						}
						oScheduleStaff["content"][0]["members"][iWeekCount]["members"][iDayCount] = { // Create a day
							isSelected: false,
							dayDate: formatedDate,
							date: date,
							isServiceOrder: true,
							isPHoliday: bHil,
							publicHolidayShort: sHolShort,
							publicHolidayLong: sHolLong,
							isStaffing: true,
							members: new Array()
						};

						for (var iCount = 0, iLength = aResults.length; iCount < iLength; iCount++) {
							var sResultDate = aResults[iCount].Date;
							sResultDate = formatter.fnParseDateCompare(sResultDate);
							if (compareDate === sResultDate) {
								var sId = aResults[iCount].Employee_Id;
								var sEmail = aResults[iCount].Email_Address;
								var sFirstName = aResults[iCount].First_Name;
								var sLastName = aResults[iCount].Last_Name;

								if (sFirstName && sLastName) { // If there is employee id then somebody is staffed
									oScheduleStaff["content"][0]["members"][iWeekCount]["members"][iDayCount]["members"].push({
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
								} else { // Otherwise indicate nobody is staffed in the role
									oScheduleStaff["content"][0]["members"][iWeekCount]["members"][iDayCount]["members"].push({
										firstName: "Slot Empty",
										lastName: "",
										role: aResults[iCount].Role,
										serviceOrder: aResults[iCount].Service_Order_Id,
										serviceItem: aResults[iCount].Service_Item_Id
									});
								}
							}
						}
						if (oScheduleStaff["content"][0]["members"][iWeekCount]["members"][iDayCount]["members"].length == 0) { // If no members exist in a day cell, this means there is nobody staffed
							oScheduleStaff["content"][0]["members"][iWeekCount]["members"][iDayCount]["isServiceOrder"] = false;
							oScheduleStaff["content"][0]["members"][iWeekCount]["members"][iDayCount]["serviceError"] =
								"BackOffice Staffing has not been created for this time frame. Please contact the BackOffice of this region";
							oScheduleStaff["content"][0]["members"][iWeekCount]["members"][iDayCount]["noStaffing"] = true;
						}
						date.setDate(date.getDate() + 1); // Increment to next Date
					}
				}
			};

			var oDateTimeStaffBeg = formatter.dateFormatChange(sDate);
			var oDateTimeStaffEnd = formatter.dateFormatChange(eDate);
			//var aURLParam = ["$filter= Date ge '" + sDate + "' and Date le'" + eDate + "' and Region eq '" + sRegion + "' and Team_Id eq '" + sTeam+"'"];
			var aURLParam = ["$filter= Date ge " + oDateTimeStaffBeg + " and Date le " + oDateTimeStaffEnd + " and Region eq '" + sRegion +
				"' and Team_Id eq '" + sTeam + "' and Page eq 'Month'"
			];
			
			/*var aResults = DataManager.getStaffing(sap.ui.getCore().byId("Boost.app").getModel("odata"), aURLParam);
			fnStaffReadSucc(aResults);*/
			this.getModel("default").read("/Staffing", {
				urlParameters: aURLParam,
				success: function (oData) {
					fnStaffReadSucc(oData.results);
					var oMonthScheduleStaffModel = new JSONModel();
					oMonthScheduleStaffModel.setData(oScheduleStaff.content[0]);
					var oMonthHeaderRow = this.getView().byId("Boost.view.month.Layout");
					oMonthHeaderRow.setModel(oMonthScheduleStaffModel, "StaffMonthModel");
					this.getView().setBusy(false);
				}.bind(this)
			});
		}

	});
});