sap.ui.define([
	"sap/support/boost/controller/BaseController",
	"sap/support/boost/model/formatter"
], function (BaseController, formatter) {
	"use strict";

	return BaseController.extend("sap.support.boost.controller.App", {

		formatter: formatter,
		onInit: function () {
			this.getModel("datePick").setProperty("/", {
				"date": new Date()
			});
			//  initial page is day
			this.getModel("Config").setProperty("/region", true);
			this.getModel("Config").setProperty("/team", false);
			this.getModel("selectedKey").setProperty("/page", "day");
			this.getModel("selectedKey").setProperty("/region", "EMEA BACKOFFICE");
			this.getModel("selectedKey").setProperty("/team", "Control Center");
			this.getRegions();
			this.getTeams();
			this.sRegionParam = this.getUrlVars()["region"] || "EMEA BACKOFFICE"; //URL Params

			var data =
				"<strong>URL Parameters</strong><ul><li>To go to a specific view add the following to the end of URL: ?view=month. View ids day, month, dtmn.</li>" +
				"<li>To go to specific region add ?region=EMEA for example</li></ul>";

			this.getModel("Info").setProperty("/HTML2", data);
			this.getView().setModel("Info");
			sap.ui.core.LocaleData.getInstance(sap.ui.getCore().getConfiguration().getFormatSettings().getFormatLocale()).mData[
				"weekData-firstDay"] = 1;
		//	this._checkEnvironment();

		//	if (this._checkEnvironment() == 0) {
		//		TimeZoneSettings._setTimeZoneModelToView(this, "sap.coe.capacity.reuselib");
		//	}
		
			sap.ui.getCore().getConfiguration().getFormatSettings().setFirstDayOfWeek(1);
			this.getRouter().getRoute("day").attachPatternMatched(this._onRouteMatched, this);
		},
		_onRouteMatched: function(oEvent){
			var auth = this.getModel("default").getProperty("/ResAuthCheckSet('')").Authorized;
			this.getModel("Auth").setProperty("/authorization", auth);
		},

		getRegions: function () {
			var sFullDate = this.getModel("datePick").getProperty("/date");
			var oDateTimeRegions = formatter.dateFormatChange(sFullDate);
			//	oDateTimeRegions = "datetime'2020-02-26T00:00:00'"; // for Mock Server
			var aURLParam = ["$filter= Date eq " + oDateTimeRegions];
			this.getModel("default").read("/Regions", {
				urlParameters: aURLParam,
				success: function (oData) {
					this.getModel("Regions").setData(oData.results);
					this.getModel("selectedKey").setProperty("/region", this.sRegionParam);
				}.bind(this),
				error:function(oResponce){
					new sap.m.MessageToast.show("No Regions data..");
				}.bind(this)
			});
		},

		getTeams: function () {
			var oFullDate = this.getModel("datePick").getProperty("/date");
			var oDate = new Date(oFullDate.getTime());
			oDate.setMonth(oDate.getMonth() - 1);
			var oDateTimeTeamsBeg = formatter.dateFormatChange(oDate);
			var oDateTimeTeamsEnd = formatter.dateFormatChange(oFullDate);
			//hardcode for mock server
			//	oDateTimeTeamsBeg = "datetime'2020-01-26T00:00:00'";
			//	oDateTimeTeamsEnd = "datetime'2020-02-26T00:00:00'";
			var sRegion = this.getModel("selectedKey").getProperty("/region");
			var aURLParam = ["$filter= Date ge " + oDateTimeTeamsBeg + " and " + "Date le " + oDateTimeTeamsEnd + " and " + " Region eq '" +
				sRegion + "'", "$orderby=Team_Id"
			];
			this.getModel("default").read("/Teams", {
				urlParameters: aURLParam,
				success: function (oData) {
					// Removing Duplicate Data
					var arr = [];
					var aArray = [];
					for (var i = 0; i < oData.results.length; i++) {
						arr.push(oData.results[i].Team_Id);
					}
					arr = arr.filter((item, index) => arr.indexOf(item) === index);
					for (var j = 0; j < arr.length; j++) {
						aArray.push({
							"Team_Id": arr[j]
						});
					}
					this.getModel("Teams").setData(aArray);
					//	this.getModel("Teams").setData(oData.results);
					//	this.getModel("selectedKey").setProperty("/team", "Control Center");
					//this.getModel("selectedKey").setProperty("/team", oData.results[0].Team_Id);
					if (!this._adminSelect) {
						this.getModel("selectedKey").setProperty("/team", "Control Center");
					} else {
						this.getView().byId("combo_Team").setValue("");
					}
				}.bind(this),
				error:function(oResponce){
					new sap.m.MessageToast.show("No Teams data..");
				}.bind(this)
			});
		},

		handleRegionChange: function () {
			this.getTeams();
			var oEventBus = sap.ui.getCore().getEventBus();
			var sPageName = this.getModel("selectedKey").getProperty("/page");
			if (sPageName === "day") {
				oEventBus.publish("app", "getDayStaffingDate");
			}
			if (sPageName === "month") {
				oEventBus.publish("app", "getMonthStaffingDate");
			}
			if (sPageName === "admin") {
				this._adminSelect = true;
				oEventBus.publish("app", "getAdminStaffingDate")
			}
		},

		handleTeamChange: function () {
			var oEventBus = sap.ui.getCore().getEventBus();
			if (this.getModel("selectedKey").getProperty("/page") === "month") {
				this.getTeams();
				oEventBus.publish("app", "getMonthStaffingDate");
			}
			if (this.getModel("selectedKey").getProperty("/page") === "admin") {
				//	this.getTeams();
				var Teamname = this.getModel("selectedKey").getProperty("/team");
				this.getModel("selectedKey").setProperty("/team", Teamname);
				oEventBus.publish("app", "getAdminStaffingDate");
			}
		},

		handleDatePickerChange: function () {
			var oEventBus = sap.ui.getCore().getEventBus();
			if (this.getModel("selectedKey").getProperty("/page") === "day") {
				oEventBus.publish("app", "getDayStaffingDate");
				if (this.getModel("Teams").getData().length <= 0) {
					this.getTeams();
				}
			}
			if (this.getModel("selectedKey").getProperty("/page") === "month") {
				this.getTeams();
				oEventBus.publish("app", "getMonthStaffingDate");
			}
			if (this.getModel("selectedKey").getProperty("/page") === "admin") {
				this.getTeams();
				oEventBus.publish("app", "getAdminStaffingDate");
			}
		},

		onDay: function () {
			this.getModel("Config").setProperty("/region", true);
			this.getModel("Config").setProperty("/team", false);
			this.getRouter().navTo("day");
			// this.getEventBus().publish("app", "getDayStaffingDate");
		},

		onMonth: function () {
			this.getModel("Config").setProperty("/region", true);
			this.getModel("Config").setProperty("/team", true);
			this.getRouter().navTo("month");
			// this.getEventBus().publish("app", "getMonthStaffingDate");

		},

		onDutyManager: function () {
			this.getModel("Config").setProperty("/region", false);
			this.getModel("Config").setProperty("/team", false);
			this.getRouter().navTo("dtmngr");
			// this.getEventBus().publish("app", "getDTMNStaffingDate");
		},
		onAdmin: function () {
			var auth = this.getModel("default").getProperty("/ResAuthCheckSet('')").Authorized;
			if(!auth){
			sap.m.MessageBox.error("Your not Authorized to open Admin page!! \n Please contact your backoffice",{
				title:"Authorization Information"
			});
			this.getModel("Config").setProperty("/region", true);
			this.getModel("Config").setProperty("/team", false);
			this.getRouter().navTo("day");
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.publish("app", "getDayStaffingDate");
			return;
			}else{
			this.getModel("Config").setProperty("/region", true);
			this.getModel("Config").setProperty("/team", true);
			this.getRouter().navTo("admin");
			}
		},
		onStaffingCheck : function(oEvent){
			//Workaround 
			var aTest = "03282023";
			var gData = [];
			gData=this.getModel("Staffed").getProperty("/sData");
			var oFilters = [];
			var filter1 = new sap.ui.model.Filter("SysFlag",
			sap.ui.model.FilterOperator.EQ, aTest);
			oFilters.push(filter1);
			// sap.support.boost.ISModel.setUseBatch(false);
			// var InternalOrder = this.getView().getModel("IODetails").getProperty("/InternalOrd");
				
			this.getView().getModel("staffModel1").read("/InternalOrderHeaderSet('" + 620443249 + "')", {
				filters: oFilters,
				urlParameters: {
						"$expand": "OrderHeaderStaffingRes"
					},
				success: function (oData, oResponse) {
					that.getView().setBusy(false);
					var model = new sap.ui.model.json.JSONModel({
						UsageLogSet: oData.results
					});
					that.getView().setModel(model, "UsageLog");
				}
			});
		},
		calPrev: function () {
			var oDatePicker = this.getView().byId("DP1");
			var sPageName = this.getModel("selectedKey").getProperty("/page");
			var oDate = null;
			if (sPageName === "day") { // Iterate one day
				oDate = this.getView().byId("DP1").getDateValue();
				oDate.setDate(oDate.getDate() - 1);
				this.getModel("datePick").setProperty("/date", oDate);
				oDatePicker.setDateValue(oDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			} else if (sPageName === "month") { // Iterate month
				this.getTeams();
				oDate = this.getView().byId("DP1").getDateValue();
				var oTargetDate = formatter.fnSetDatePast(oDate, 1, 0);
				oDatePicker.setDateValue(oTargetDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			}
		},

		calNext: function () {
			var sPageName = this.getModel("selectedKey").getProperty("/page");
			var oDatePicker = this.byId("DP1");
			var oDate = null;
			if (sPageName === "day") {
				oDate = this.getView().byId("DP1").getDateValue();
				oDate.setDate(oDate.getDate() + 1);
				this.getModel("datePick").setProperty("/date", oDate);
				oDatePicker.setDateValue(oDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			} else if (sPageName === "month") {
				this.getTeams();
				oDate = this.getView().byId("DP1").getDateValue();
				var oTargetDate = formatter.fnSetDateAhead(oDate, 1, 0);
				oDatePicker.setDateValue(oTargetDate);
				oDatePicker.rerender();
				oDatePicker.fireChange();
			}
		},
		onMessageInformationDialogPress: function (oEvent) {
			var oButton = oEvent.getSource();
			if (!this._actionLog) {
				this._actionLog = sap.ui.xmlfragment("sap.support.boost.fragment.Info", this);
				this.getView().addDependent(this._actionLog);
			}
			this._actionLog.open(oButton);
		},
		closeDialog: function () {
			this._actionLog.close();
		},
		onBeforeRendering: function () {
			this.getView().setModel(this.getOwnerComponent().getModel("resReq"));
		//	if (this._checkEnvironment() == 0) {
		//		TimeZoneSettings._setAppSettingButtons(this);
		//		TimeZoneSettings._getUserTimeZone(this);
		//	}
		},
	/*	_checkEnvironment: function () {
			var url = document.location.toString();
			var arrUrl = url.split("//");
			var index = arrUrl[1].indexOf("fiorilaunchpad");

			return index;
		},*/
		openITDticketpress : function(oEvent){
		//	window.open("https://fiorilaunchpad.sap.com/sites#Help-Inbox&/create/ZINE/IMAS_SUD_MC/Issue%20with%20'BOOST'/03/null/null/Issue%20Description%20and%20steps%20to%20reproduce%20this%20issue");
			// https://jira.tools.sap/browse/KNGMHM02-27926
		//	window.open("https://itsupportportal.services.sap/itsupport?id=itsm_sc_cat_item&sys_id=b1982b441bb1c1105039a6c8bb4bcbc3&sysparm_variables=%7B%22business_service%22:%2221af9c6f1ba564905039a6c8bb4bcb61%22,%22service_offering%22:%2210c283dd1b8e259036ac10e69b4bcb28%22,%22assignment_group%22:%22e5818b511b8e259036ac10e69b4bcbd4%22,%22short_description%22:%22Issue%20with%20MCC%20BOOST%22,%22description%22:%22Issue%20Description%20and%20steps%20to%20reproduce%20this%20issue%22%7D");
			// https://jira.tools.sap/browse/KNGMHM02-28253
			window.open("https://fiorilaunchpad.sap.com/sites#Help-Inbox&/create/ZINE/IMAS_SUD_MC/Issue%20with%20'BOOST'/03/null/null/Issue%20Description%20and%20steps%20to%20reproduce%20this%20issue");
		},
			onSystemDowntime : function(oEvent){
				
			var urlData = "systemsnewcollection";
			var ocurrentDate = Number(new Date());
		//	var launchpadUrl = 'https://flpsandbox-br339jmc4c.dispatcher.int.sap.eu2.hana.ondemand.com/sap/fiori/plancalendar/help/systemsnewcollection';
		//	var downTimeUrl =launchpadUrl+ocurrentDate;
			jQuery.ajax({
				type: "GET",
				url: "/help/systemsnewcollection",
				cache: false,
				async: false,
				dataType: "json",
				success: function (result, response, request) {
				var downTimestatus =result.SystemStatusNew.filter(function(item){
					return (item.SYSTEMID === "ISP" || item.SYSTEMID === "IST" || item.SYSTEMID === "ISD" || item.SYSTEMID === "ICP" || item.SYSTEMID === "ICT" || item.SYSTEMID === "ICD");
				});
				var oDialogModel = new sap.ui.model.json.JSONModel({
							inputValue: downTimestatus
				});
					for(var i=0;i<downTimestatus.length;i++){
						if(downTimestatus[i].AVAILABILITYSTATUS === "1"){
							downTimestatus[i].AVAILABILITYSTATUS = "Error";
							downTimestatus[i].Desc = "UnPlanned DownTime since" +" " + downTimestatus[i].LASTUNPLANDTSTART.split("T")[0]+" "+downTimestatus[i].LASTUNPLANDTSTART.split("T")[1].split("Z")[0] + "(CET/CEST)";
						}
						if(downTimestatus[i].AVAILABILITYSTATUS === "2"){
							downTimestatus[i].AVAILABILITYSTATUS = "Warning";
							downTimestatus[i].Desc = "Planned Downtime Until" + " " + downTimestatus[i].NEXTPLANDTEND.split("T")[0]+" "+downTimestatus[i].NEXTPLANDTEND.split("T")[1].split("Z")[0] + "(CET/CEST)";
						}
						if(downTimestatus[i].AVAILABILITYSTATUS === "3"){
							downTimestatus[i].AVAILABILITYSTATUS = "Success";
							downTimestatus[i].Desc = "Available";
						}
					}
					
					this.oDowntimeJson = new sap.ui.model.json.JSONModel(downTimestatus);
					this.setModel(this.oDowntimeJson,"popData");
				
				if (!this.oDefaultDialog) {
					this.oDefaultDialog = new sap.m.Dialog({
						title: "System DownTime Status(IC&IS)",
						draggable : true,
						resizable : true,
						contentHeight : "80%",
						contentWidth : "40%",
						state : "Information",
						width : "100%",
						titleAlignment : "Center",
						content: new sap.m.List({
							
							items: {
								path: "popData>/",
								template: new sap.m.StandardListItem({
								title: "{popData>SYSTEMID}-{popData>CUSTOMERNAME}",
									description: "{popData>Desc}",
									info: "{popData>SYSTEMID}",
									infoState : "{popData>AVAILABILITYSTATUS}",
									highlight : "{popData>AVAILABILITYSTATUS}",
									infoStateInverted : true,
									wrapping : true,
									wrapCharLimit:1000,
									iconInset : false,
									type:"Active",
									tooltip : "{popData>Desc}",
									press: function(oEvent){
									//	new sap.m.MessageToast.show("Button Pressed");
									var oSelectobjData = this.getModel('popData').getProperty(oEvent.getSource().getBindingContextPath());
									var nxtUnplannedstart = oSelectobjData.NEXTPLANDTSTART === ""? "No Data Available" : oSelectobjData.NEXTPLANDTSTART.split("T")[0]+" "+oSelectobjData.NEXTPLANDTSTART.split("T")[1].split("Z")[0] + "(CET/CEST)";
									var nxtUnplannedend = oSelectobjData.NEXTPLANDTEND === ""? "No Data Available" : oSelectobjData.NEXTPLANDTEND.split("T")[0]+" "+oSelectobjData.NEXTPLANDTEND.split("T")[1].split("Z")[0] + "(CET/CEST)";
									var lstUnplannedstart = oSelectobjData.LASTUNPLANDTSTART === ""? "No Data Available" : oSelectobjData.LASTUNPLANDTSTART.split("T")[0]+" "+oSelectobjData.LASTUNPLANDTSTART.split("T")[1].split("Z")[0] + "(CET/CEST)";
									var lstUnplannedend = oSelectobjData.LASTUNPLANDTEND === ""? "No Data Available" : oSelectobjData.LASTUNPLANDTEND.split("T")[0]+" "+oSelectobjData.LASTUNPLANDTEND.split("T")[1].split("Z")[0] + "(CET/CEST)";
									new sap.m.MessageBox.information("SystemID:"+ " " + oSelectobjData.SYSTEMID +
									"\n Customer Name:"+ " " + oSelectobjData.CUSTOMERNAME + 
									"\n Customer No:"+ " " + oSelectobjData.CUSTOMERID + 
									"\n Description:"+ " " + oSelectobjData.Desc +
									"\n\n Next UnplannedStart:"+ " " + nxtUnplannedstart +
									"\n Next UnplannedEnd:"+ " " + nxtUnplannedend +
									"\n\n Last UnplannedStart:"+ " " + lstUnplannedstart +
									"\n Last UnplannedEnd:"+ " " + lstUnplannedend,{title:oSelectobjData.SYSTEMID+" "+"Downtime Status"});
									}
								})
							}
						}),
						beginButton: new sap.m.Button({
							text: "OK",
							type:"Emphasized",
							press: function (oEvent) {
								this.oDefaultDialog.close();
							}.bind(this)
						})
					});
					this.getView().addDependent(this.oDefaultDialog);
				}
					this.oDefaultDialog.addStyleClass("sapUiSizeCompact");
					var authCheck = this.getModel("default").getProperty("/ResAuthCheckSet('')");
					if(authCheck){
					if(authCheck.Authorized){
						jQuery.sap.delayedCall(500, this, function(){
								this.oDefaultDialog.getContent()[0].getBinding('items').sort(new sap.ui.model.Sorter({path:"SYSTEMID",descending:false}));
								this.oDefaultDialog.open();
						});
					}
					}else{
						sap.m.MessageToast.show("You have been not authorized..! Try to refresh the app or contact to admin");
					}
				}.bind(this),
				error: function (responce) {
					sap.ui.core.BusyIndicator.hide();
					sap.m.MessageBox.error("Data Loading Error! Try refreshing the app.");
				}.bind(this)
			});
		}
	});
});