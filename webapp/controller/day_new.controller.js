sap.ui.define([
	"sap/support/boost/controller/BaseController",
	"sap/support/boost/model/formatter",
	"sap/ui/layout/cssgrid/CSSGrid",
	'sap/ui/commons/layout/MatrixLayoutRow',
	'sap/ui/commons/layout/MatrixLayoutCell',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment',
], function (BaseController, formatter, CSSGrid, MatrixLayoutRow, MatrixLayoutCell, JSONModel, Fragment) {
	"use strict";

	return BaseController.extend("sap.support.boost.controller.day", {
		onInit: function () {
			this.setModel(new JSONModel(), "MetaTeamModel"); //header
			this.setModel(new JSONModel(), "TeamModel");
			this.setModel(new JSONModel(), "StaffHeaderModel");
			this.setModel(new JSONModel(), "StaffModel");
			this.getModel("datePick").setProperty("/", {
				"date": new Date()
			});
			this.getModel("selectedKey").setProperty("/region", "EMEA");
			this.oFlagShowActs = window.location.href.indexOf("workload=X") === -1 ? false : true;
			this.getModel("UrlPara").setProperty("/workload", this.oFlagShowActs);
			// this.getDayStaffing();
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("app", "getDayStaffingDate", this.getDayStaffing, this);
			this.getRouter().getRoute("day").attachPatternMatched(this._onRouteMatched, this);
		},
		_onRouteMatched: function () {
			this.getDayStaffing();
		},
		getDayStaffing: function () {
			var oTeamData = {};
			this.oTeamData = oTeamData;
			var oLookupGroups = {};
			this.oLookupGroups = oLookupGroups;
			var oFullDate = this.getModel("datePick").getProperty("/date");
			var sRegion = this.getModel("selectedKey").getProperty("/region");
			//TODO: mock Staffing data
			this.oModel = new JSONModel();
			this.oModel.loadData(sap.ui.require.toUrl("sap/support/boost/localService/mockdata/Staffing.json"), {}, false, "GET");
			//get teams data
			var sDateTimeTeam = formatter.dateFormatChange(oFullDate); // only for Mock Server
			sDateTimeTeam = "datetime'2020-02-26T00:00:00'";
			var aUrlTeamParams = ["$filter=Date eq " + sDateTimeTeam + " and Region eq '" + sRegion + "'", " $orderby=Topic"];
			this.getModel().read("/Teams", {
				urlParameters: aUrlTeamParams,
				success: function (oData) {
					var teamsResults = oData.results;
					this.fnReadTeamsSuccess(teamsResults);
					//get staffing data
					var staffingResults = this.oModel.getData().d.results;
					oTeamData = this.fnReadStaffingSuccess(staffingResults);
					//this._setData(oTeamData); // work fine on Matrixlayout
					//	this.setGritListData(oTeamData);
					this.setMatrixData(oTeamData);
				}.bind(this)
			});

			//get staffing data
			// var sDateTimeStaff = formatter.dateFormatChange(oFullDate);
			// var aUrlStaffingParams = ["$filter=Date eq " + sDateTimeStaff + " and Region eq '" + sRegion]; // hardcode workload
			// this.getModel().read("/Staffing", {
			// 	urlParameters: aUrlStaffingParams,
			// 	success: function (oData) {
			// 		this.fnReadStaffingSuccess(oData, oTeamData, oLookupGroups);
			// 		this._setData(oTeamData);
			// 	}.bind(this)
			// });

		},

		setMatrixData: function (oStaffData) {
			// var oStaffHeaderModel = new JSONModel();
			this.getModel("StaffModel").setData({
				"metaTeams": oStaffData
			});
			// var ostaffHeaderRow = this.getView().byId("Boost.view.day.Layout.H");
			// ostaffHeaderRow.setModel(oStaffHeaderModel, "StaffHeaderModel");

			// oStaffData.rows.shift();
			// this.getModel("StaffModel").setData(oStaffData);
			// var ostaffRow = this.getView().byId("Boost.view.day.Layout");
			// ostaffRow.setModel(oStaffModel, "StaffModel");
		},

		fnReadTeamsSuccess: function (teamResults) {
			var oDataMetaTeam = []; //this.getModel("MetaTeamModel").getData();
			var oResultMetaTeam = [];
			var oDataTeam = []; //this.getModel("MetaModel").getData();
			for (var i = 0; i < teamResults.length; i++) {
				var iIndexMetaTeams = jQuery.inArray(teamResults[i].Meta_Team, oDataMetaTeam);
				if (iIndexMetaTeams === -1) {
					oDataMetaTeam.push(teamResults[i].Meta_Team); //get all meta_teams[meta_team1, meta_team2]
					oResultMetaTeam.push({
						"name": teamResults[i].Meta_Team,
						"mailto": "",
						"teams": []
					});
				}
				// oDataTeam[teamResults[i].Team_Id] = teamResults[i];
				oDataTeam.push({
					"metaTeam":teamResults[i].Meta_Team,
					"name": teamResults[i].Team_Id,
					"showList": true,
					"mailto": "",
					"publicHolidayShort": teamResults[i].Holiday_Text_Short,
					"publicHolidayLong": teamResults[i].Holiday_Text_Long,
					"isPHoliday": teamResults[i].Is_Holiday,
					"Topic": teamResults[i].Topic,
					"members": []
				});
			}
			this.getModel("MetaTeamModel").setData({
				"results": oResultMetaTeam,
				// "metaTeam":oDataMetaTeam
			});
			oDataTeam.sort(function(a,b){
				return parseInt(a.Topic) - parseInt(b.Topic);
			});
			this.getModel("TeamModel").setData({
				"results": oDataTeam
			});
		},
		fnReadStaffingSuccess: function (aResults) {
			var oTeamsInit = this.getModel("TeamModel").getProperty("/results");
			var oMetaTeamData = this.getModel("MetaTeamModel").getProperty("/results");
			var oTeamMember = [],
				oTeamData = {};
			for (var i = 0; i < aResults.length; i++) {
				for (var t = 0; t < oTeamsInit.length; t++) {
					if (aResults[i].Team_Id === oTeamsInit[t].name) {
						oTeamData = oTeamsInit[t];
					}
				}
				if (aResults[i].First_Name.length < 1 && aResults[i].Last_Name.length < 1 && aResults[i].Employee_Id.length < 1) {
					oTeamData.members.push({
						firstName: "Slot Empty",
						role: aResults[i].Role,
						serviceOrder: aResults[i].Service_Order_Id,
						serviceItem: aResults[i].Service_Item_Id,
						icon: false,
					});
				} else {
					oTeamData.members.push({
						employeeId: aResults[i].Employee_Id,
						firstName: aResults[i].First_Name,
						lastName: aResults[i].Last_Name,
						role: aResults[i].Role,
						mobile: aResults[i].Mobile_Number,
						tel: aResults[i].Phone_Number,
						mailto: aResults[i].Email_Address,
						deskLocation: aResults[i].DeskLocation,
						serviceOrder: aResults[i].Service_Order_Id,
						serviceItem: aResults[i].Service_Item_Id,
						note: aResults[i].Note,
						// Activity
						acts: aResults[i].Act_Count,
						actNum: aResults[i].Act_Object_Id,
						incs: aResults[i].Inc_Count,
						incNum: aResults[i].Inc_Object_Id,
						total: aResults[i].Total_Count,
						icon: true,
					});
				}
				oTeamData["mailto"] += aResults[i].Email_Address + "; ";

			}
			// return oTeamsInit;
			for (var g = 0; g < oTeamsInit.length; g++) {
				for (var m = 0; m < oMetaTeamData.length; m++) {
						if(oTeamsInit[g].metaTeam === oMetaTeamData[m].name){
							oMetaTeamData[m].teams.push(oTeamsInit[g]);
							oMetaTeamData[m].mailto +=  oTeamsInit[g].mailto + ";" ;
						}
				}
			}
		 return oMetaTeamData;
		},
		fnReadStaffingSuccess2: function (aResults, oTeamData, oLookupGroups) {
			for (var iIndexResults = 0, il = aResults.length; iIndexResults < il; iIndexResults++) {
				var sGroup = aResults[iIndexResults].Team_Id;
				var aIndices = oLookupGroups[sGroup];
				if (aIndices) {
					if (aResults[iIndexResults].First_Name.length < 1 && aResults[iIndexResults].Last_Name.length < 1 && aResults[iIndexResults].Employee_Id
						.length < 1) {
						oTeamData["rows"][aIndices[0] + 1]["cells"][aIndices[1]]["members"].push({
							firstName: "Slot Empty",
							role: aResults[iIndexResults].Role,
							serviceOrder: aResults[iIndexResults].Service_Order_Id,
							serviceItem: aResults[iIndexResults].Service_Item_Id,
							icon: false,
						});
					} else {
						oTeamData["rows"][aIndices[0] + 1]["cells"][aIndices[1]]["members"].push({
							employeeId: aResults[iIndexResults].Employee_Id,
							firstName: aResults[iIndexResults].First_Name,
							lastName: aResults[iIndexResults].Last_Name,
							role: aResults[iIndexResults].Role,
							mobile: aResults[iIndexResults].Mobile_Number,
							tel: aResults[iIndexResults].Phone_Number,
							mailto: aResults[iIndexResults].Email_Address,
							deskLocation: aResults[iIndexResults].DeskLocation,
							serviceOrder: aResults[iIndexResults].Service_Order_Id,
							serviceItem: aResults[iIndexResults].Service_Item_Id,
							note: aResults[iIndexResults].Note,
							// Activity
							acts: aResults[iIndexResults].Act_Count,
							actNum: aResults[iIndexResults].Act_Object_Id,
							incs: aResults[iIndexResults].Inc_Count,
							incNum: aResults[iIndexResults].Inc_Object_Id,
							total: aResults[iIndexResults].Total_Count,
							icon: true,
						});
					}
					oTeamData["rows"][aIndices[0] + 1]["cells"][aIndices[1]]["mailto"] += aResults[iIndexResults].Employee_Id + "; ";
					oTeamData["rows"][0]["cells"][aIndices[1]]["mailto"] += aResults[iIndexResults].Employee_Id + "; ";
				}
			}
			return oTeamData;
		},

		setGritListData: function (oStaffData) {
			var oStaffModel = new JSONModel();
			var ostaffHeaderRow = this.getView().byId("staffHeader");
			ostaffHeaderRow.setModel(oStaffModel, "StaffModel");
			oStaffModel.setData(oStaffData);

			oStaffData.rows.shift();
			var oTeamsData = {};
			oTeamsData = oStaffData;
			var oTeamsContentModel = new JSONModel();
			var ostaffContentRow = this.getView().byId("staffContent");
			ostaffContentRow.setModel(oTeamsContentModel, "StaffContentModel");
			/*var ostaffContentRow1 = this.getView().byId("staffContent1");
			ostaffContentRow1.setModel(oTeamsContentModel, "StaffContentModel");*/
			oTeamsContentModel.setData(oTeamsData);
		},

		onPressMail: function (oEvent) {
			var sMailtoString = oEvent.getSource().getBindingContext("StaffModel").getObject().mailto;
			// var oList = oEvent.getSource().getParent().getParent();
			// var aItems = oList.getItems();
			// var sMailtoString = "";
			// for (var i = 0; i < aItems.length; i++) {
			// 	var oContext = aItems[i].oBindingContexts;
			// 	var oObject = oContext.StaffModel.getObject(oContext.StaffModel.sPath);
			// 	if (oObject.hasOwnProperty("mailto")) {
			// 		sMailtoString += oObject.mailto + ";";
			// 	}
			// }
			if (sMailtoString.length > 1)
				sap.m.URLHelper.triggerEmail(sMailtoString);
		},

		handleIncPopup: function (oEvent) {
			var oButton = oEvent.getSource();
			var sIncs = oEvent.getSource().getCustomData()[0].getValue();
			var sDateJson = this.getIncidentsList(sIncs);
			this.getModel("Incidents").setJSON(sDateJson);
			if (!this._incDialog) {
				this._incDialog = sap.ui.xmlfragment("sap.support.boost.view.incDialog", this);
				this._incDialog.setModel(this.getModel("Incidents"), "Incide");
			}
			this._incDialog.open();
		},

		hanldIncDialogClose: function () {
			this._incDialog.close();
		},

		getIncidentsList: function (str) {
			var aRaw = str.split(";");
			var aJson = [];
			aRaw.forEach(function (val) {
				if (val) {
					var sFullId = val.replace(/\s*/g, "");
					var sShortId = this._extractShortIncId(sFullId);
					var sJson = "{\"incId\":" + "\"" + sShortId + "\", \"fullIncId\":" + "\"" + sFullId + "\"" + "}";
					aJson.push(sJson);
				}
			}.bind(this));
			var sDateJson = "[" + aJson.toString() + "]";
			return sDateJson;
		},

		_extractShortIncId: function (str) {
			if (str.length == 24) {
				var aRes = str.slice(10).split("");
				aRes.splice(10, 0, "/");
				return aRes.join("").replace(/\b(0+)/gi, "");
			} else {
				return str;
			}
		},

		handleIncPress: function (oEvent) {
			var sId = oEvent.getSource().getCustomData()[0].getValue();
			window.open("ht" + "tps://launchpad.support.sap.com/#incident/pointer/" + sId);
		},

		//---------------------Below FM all for staff fragment----------------------------------//
		handleStaffPress: function (oEvent) {
			this.handleStaffPopup(oEvent);
		},

		handleStaffPopup: function (oEvent) {
			var oButton = oEvent.getSource();
			Fragment.load({
				name: "sap.support.boost.view.staffPopover",
				controller: this
			}).then(function (oPopover) {
				this._oPopover = oPopover;
				this.getView().addDependent(this._oPopover);
				this._oPopover.setModel(oButton.oBindingContexts.StaffModel.getModel());
				this._oPopover.bindElement(oButton.oBindingContexts.StaffModel.sPath);
				this._oPopover.openBy(oButton);
			}.bind(this));
		},

		handlePressMailItem: function (oEvent) {
			sap.m.URLHelper.triggerEmail(oEvent.getSource().getValue());
		},
		handlePressTelItem: function (oEvent) {
			sap.m.URLHelper.triggerTel(oEvent.getSource().getValue());
		},
		handlePressMobItem: function (oEvent) {
			sap.m.URLHelper.triggerTel(oEvent.getSource().getValue());
		},
		handlePressMailIcon: function (oEvent) {
			oEvent.getSource().getParent().getParent().getItems()[0].getItems()[2].firePress();
		},
		handlePressTelIcon: function (oEvent) {
			oEvent.getSource().getParent().getParent().getItems()[0].getItems()[3].firePress();
		},
		handlePressMobIcon: function (oEvent) {
			oEvent.getSource().getParent().getParent().getItems()[0].getItems()[4].firePress();
		}
	});
});