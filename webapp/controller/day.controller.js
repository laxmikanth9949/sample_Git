sap.ui.define([
	"sap/support/boost/controller/BaseController",
	"sap/support/boost/model/formatter",
	"sap/ui/layout/cssgrid/CSSGrid",
	'sap/ui/commons/layout/MatrixLayoutRow',
	'sap/ui/commons/layout/MatrixLayoutCell',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment',
	"sap/support/boost/fragment/AssignWorklistDemand.fragment.controller",
	"sap/support/boost/util/i18n",
	"sap/support/boost/util/helpers",
	"sap/support/boost/fragment/AssignmentsWarningHelper.fragment.controller",
	"sap/support/boost/model/formatterReuse",
	"sap/support/boost/util/ErrorCodeHelper"
], function (BaseController, formatter, CSSGrid, MatrixLayoutRow, MatrixLayoutCell, JSONModel, Fragment,
	AssignWorklistDemandController, i18n, helpers, AssignmentsWarningHelper, formatterReuse, ErrorCodeHelper) {
	"use strict";

	return BaseController.extend("sap.support.boost.controller.day", {
		formatter: formatter,
		formatterReuse: formatterReuse,

		onInit: function () {
			this.getView().setModel(new JSONModel(), "AssigndDemand");
			this.getView().setModel(new JSONModel(), "IODetails");
			this.getView().setModel(new JSONModel(), "DemandID");
			this.getView().setModel(new JSONModel(), "MappingData");
			this.getView().setModel(new JSONModel(), "SuggestListData");
			this.getView().setModel(new JSONModel(), "EscalationData"); //for crm Escalationdata
			this.getView().setModel(new JSONModel(), "StaffingData"); // for staffing data - c5325212
			this.setModel(new JSONModel(), "StaffHeaderModel");
			this.setModel(new JSONModel({
				results: [],
				loadComplete: false
			}), "teams");
			this.setModel(new JSONModel({
				results: [],
				loadComplete: false
			}), "staffInit");
			this.getModel("datePick").setProperty("/", {
				"date": new Date()
			});

			// this.getModel("selectedKey").setProperty("/region", "EMEA");
			this.oFlagShowActs = window.location.href.indexOf("workload=X") === -1 ? false : true;
			this.getModel("UrlPara").setProperty("/workload", this.oFlagShowActs);
			// this.getDayStaffing();
			this.getEscalationData();
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("app", "getDayStaffingDate", this.getDayStaffing, this);
			oEventBus.subscribe("day", "getDayStaffing", this.getDayStaffing, this);
			this.getRouter().getRoute("day").attachPatternMatched(this._onRouteMatched, this);

			var oModel = new JSONModel({
				HTML: "MCC Production Support staffing on public holiday and weekend is visible in BOOST region pages.<br>" +
					"Product Support staffing is published in the " +
					//	"<a href= \"http:/supporttools-scpci.mo.sap.corp:1080/weekend\" target='_blank'>Weekend and Holiday Support Page </a>"
					"<a href= \"http:///scpaci.bss.net.sap.:1080/24x7/intropage/frame.htm\" target='_blank'>Weekend and Holiday Support Page </a>"
			});

			var auth = this.getModel("default").getProperty("/ResAuthCheckSet('')").Authorized;
			this.getModel("Auth").setProperty("/authorization", auth);
			this.getView().setModel(oModel);
			this.trackUser(this.getOwnerComponent(),this.getOwnerComponent().getModel("userModel").getData().name);

		},
		_onRouteMatched: function () {
			this.getModel("teams").setProperty("/loadComplete", false);
			this.getModel("staffInit").setProperty("/loadComplete", false);
			this.getEscalationData();
			this.getDayStaffing();
		},
		//for crm Escalationdata
		getEscalationData : function(staffedData){
			
			if(staffedData){
				var oEmp = staffedData.Employee_Id;
			var sUrl = sap.support.boost.servicenowEscalationUrl + '?sysparm_query=state=100%5eORstate=101%5eu_escalation_type=0&assigned_to.employee_number='+oEmp+'&sysparm_fields=number,state,assigned_to.employee_number';	
		
			}
			var sUrl = sap.support.boost.servicenowEscalationUrl + '?sysparm_query=state=100%5eORstate=101%5eu_escalation_type=0&sysparm_fields=number,state,assigned_to.employee_number,assigned_to,sys_id';
				$.ajax({
				method : "GET",
				url : sUrl,
				async: false,
				contentType : "application/json",
				timeout:3000,
				success : function(oData){
				//	this.getView().setBusy(false);
				this.oCustEscalationData = this.getView().getModel("EscalationData").setData(oData.result);
					var escalationLength = oData.result.length;
				//	return escalationLength;
				}.bind(this),
				error:function(oError){
					var error = oError;
				}.bind(this)
				
			});
		},
		getDayStaffing: function () {
			this.getView().setBusy(true);
			this.getEscalationData();
			var oTeamData = {};
			this.oTeamData = oTeamData;
			var oLookupGroups = {};
			this.oLookupGroups = oLookupGroups;
			var oFullDate = this.getModel("datePick").getProperty("/date");
			var sRegion = this.getModel("selectedKey").getProperty("/region");
			//TODO: mock Staffing data
			// this.oModel = new JSONModel();
			// this.oModel.loadData(sap.ui.require.toUrl("sap/support/boost/localService/mockdata/Staffing.json"), {}, false, "GET");
			//get teams data
			var sDateTimeTeam = formatter.dateFormatChange(oFullDate); // only for Mock Server
			// sDateTimeTeam = "datetime'2020-02-26T00:00:00'";
			var aUrlTeamParams = ["$filter=Date eq " + sDateTimeTeam + " and Region eq '" + sRegion + "'", " $orderby=Topic"];
			this.getModel("default").read("/Teams", {
				urlParameters: aUrlTeamParams,
				async: false,
				success: function (oData) {
					// filter weekend data in week days
					if(this.getView().getModel('datePick').getData().date.getDay() === 6 || this.getView().getModel('datePick').getData().date.getDay() === 0){
						oData.results = oData.results;
					}else{
						oData.results = oData.results.filter(function (item){
							return(item.WeekendFlag!="X");
						});
					}
					// filter weekend data in week days
					
					this.fnReadTeamsSuccess(oData.results, oTeamData, oLookupGroups);
					this.getModel("teams").setData({
						loadComplete: true,
						results: oData.results
					});
					// //get staffing data
					// this.fnReadStaffingSuccess(oTeamData, oLookupGroups);
					//get staffing data
					var sDateTimeStaff = formatter.dateFormatChange(oFullDate);
					var sWorkload = this.oFlagShowActs ? "X" : "";
					var aUrlStaffingParams = ["$filter=Date eq " + sDateTimeStaff + " and Region eq '" + sRegion + "' and WorkLoad eq " + "'" +
						sWorkload + "'" + " and Page eq 'Day'" 
					]; // hardcode workload

					this.getModel("default").read("/Staffing", {
						urlParameters: aUrlStaffingParams,
						async: false,
						success: function (oData) {
							var odata1 = [],
								odata2 = [],
								that = this;
							that.getView().getModel("DemandID").setData(oData.results);
							odata1 = oData.results.filter(function (item) {
								return (item.Assignmentstartdate !== null &&
									that.getDateString(formatter.removeTimeOffset(item.Assignmentstartdate)) <= that.getDateString(oFullDate) &&
									that.getDateString(formatter.removeTimeOffset(item.Assignmentenddate)) >= that.getDateString(oFullDate)
								);
							});
							//for crm Escalationdata
							if(this.oFlagShowActs){
								var oEscalationdata = this.getView().getModel("EscalationData").getData();
									if(oEscalationdata){
										oEscalationdata=oEscalationdata.filter(function(item){
										return(item["assigned_to.employee_number"]);
									});
								for(var i=0;i<odata1.length;i++){
									var custEsc = [];
									var custEscIDs = [];
									var custEscSys_id = [];
								//	this.getEscalationData(odata1[i]);
									for(var j=0;j<oEscalationdata.length;j++){
										if(odata1[i].Employee_Id === oEscalationdata[j]["assigned_to.employee_number"]){
											custEsc.push(oEscalationdata[j]["assigned_to.employee_number"]);
											custEscIDs.push(oEscalationdata[j].number);
											custEscSys_id.push(oEscalationdata[j].number + "-" + oEscalationdata[j].sys_id);
								//		var custEsc = oEscalationdata.filter(function(item){
								//			return(odata1[i].Employee_Id === oEscalationdata[j]["assigned_to.employee_number"]);
								//		});
										}
									}
									odata1[i].custEscCount = custEsc.length;
									odata1[i].custEscIDs = custEscIDs;
									odata1[i].custEscSys_id = custEscSys_id;
									if(odata1[i].Total_Count===""){
										odata1[i].Total_Count=0;
                                        odata1[i].Total_Count = odata1[i].Total_Count+" "+"-"+" "+ custEsc.length;
									}else{
									odata1[i].Total_Count = odata1[i].Total_Count+" "+"-"+" "+ custEsc.length;
									}
								//	odata1[i].Total_Count = odata1[i].Total_Count+" "+"-"+" "+ custEsc.length;
									
								}
									}
							}
							//for crm Escalationdata
							odata2 = oData.results.filter(function (item) {
								return (item.Assignmentstartdate === null);
							});
							this.getModel("staffInit").setData({
								loadComplete: true,
								results: jQuery.merge(odata1, odata2) //oData.results
							});
							this.fnReadStaffingSuccess(oTeamData, oLookupGroups);
						//	sap.git.usage.Reporting.addEvent(this.getOwnerComponent(), "Staffing Assignments");
							this.trackEvent(this.getOwnerComponent(),this.STFF_ASSIGNMENTS);
							//c5325212
						/*	var staffeddata = [];
							var sData = []
							for(var  i=0;i<oData.results.length;i++){
									if(oData.results[i].Employee_Id){
									var a = oData.results[i].Employee_Id;
									var bData = oData.results[i];
									staffeddata.push(a);
									this.getModel("Staffed").setProperty("/sData", staffeddata);
									this.getView().getModel("StaffingData").setProperty("/sData", staffeddata);
									}
								}*/
						}.bind(this)
					});
				}.bind(this),
				error:function(oResponce){
					this.getView().setBusy(false);
				//	this.trackEvent(this.getOwnerComponent(),"Staffing Assignments");
					new sap.m.MessageToast.show(JSON.parse(oResponce.responseText).error.message.value);
				}.bind(this)
			});
		},

		setMatrixData: function (oStaffData) {
			this.getModel("StaffHeaderModel").setData({
				"rows": [oStaffData["rows"][0]]
			});
			oStaffData.rows.shift();
			var oStaffModel = new JSONModel();
			oStaffModel.setData(oStaffData);
			var ostaffRow = this.getView().byId("Boost.view.day.Layout");
			ostaffRow.setModel(oStaffModel, "StaffModel");
			this.getView().setBusy(false);
		},

		fnReadTeamsSuccess: function (aResults, oTeamData, oLookupGroups) {
			var aGroups = []; // 2d array for x,y you get the entry of Service/Teams/TeamId corresponding to Topic x and MetaTeam y
			var aTeams = []; // 1d array consists of all distinct entries in Service/Teams/MetaTeam
			var aTopics = []; // 1d array consists of all distinct entries in Service/Teams/Topic
			var sGroup, sTopic, sTeam;

			for (var iIndexResults = 0; iIndexResults < aResults.length; iIndexResults++) {
				sGroup = aResults[iIndexResults].Team_Id;
				sTopic = aResults[iIndexResults].Topic;
				sTeam = aResults[iIndexResults].Meta_Team;

				var iIndexTopics = jQuery.inArray(sTopic, aTopics);
				if (iIndexTopics == -1) {
					iIndexTopics = aTopics.length;
					aTopics.push(sTopic);
					aGroups[iIndexTopics] = [];
				}
				var iIndexTeams = jQuery.inArray(sTeam, aTeams);
				if (iIndexTeams == -1) {
					iIndexTeams = aTeams.length;
					aTeams.push(sTeam);
				}
				aGroups[iIndexTopics][iIndexTeams] = sGroup;
				oLookupGroups[sGroup] = [iIndexTopics, iIndexTeams];
			}
			// Update column width
			//jQuery("<style type=\"text/css\">#Boost_Mob\\.view\\.day\\.Layout .sapUiMltCell{ width: " + 100/aTeams.length + "%; }</style>").appendTo("head");
			// Updating data
			oTeamData["rows"] = [];
			if (aResults.length === 0) { // if teams empty, no service order
				oTeamData["rows"][0] = {};
				oTeamData["rows"][0]["cells"] = [];
				oTeamData["rows"][0]["cells"][0] = {
					name: "BackOffice Staffing has not been created for this time frame. Please contact the BackOffice of this region",
					mailto: "",
				};
			}
			for (var iIndexTopics = 0, il = aTopics.length; iIndexTopics < il; iIndexTopics++) { // Preparing data "skeleton"
				oTeamData["rows"][iIndexTopics] = {};
				oTeamData["rows"][iIndexTopics]["cells"] = [];
				for (var iIndexTeams = 0; iIndexTeams < aTeams.length; iIndexTeams++) {
					var sPHShort = "";
					var sPHLong = "";
					var bHil = false;
					for (var i = 0; i < aResults.length; i++) {
						var sIsHoliday = aResults[i].Is_Holiday;
						if (aGroups[iIndexTopics][iIndexTeams] === aResults[i].Team_Id && sIsHoliday.length > 0) {
							sPHShort = aResults[i].Holiday_Text_Short;
							sPHLong = aResults[i].Holiday_Text_Long;
							bHil = true;
						}
					}
					var visible = true;
					if (!aGroups[iIndexTopics][iIndexTeams]) {
						visible = false;
					}
					oTeamData["rows"][iIndexTopics]["cells"][iIndexTeams] = {
						name: aGroups[iIndexTopics][iIndexTeams],
						showList: visible,
						mailto: "",
						publicHolidayShort: sPHShort,
						publicHolidayLong: sPHLong,
						isPHoliday: bHil,
						members: new Array()
					};
				}
			}
			var aColumnHeaderCells = []; // Updating column header data
			for (var iIndexTeams = 0; iIndexTeams < aTeams.length; iIndexTeams++) {
				aColumnHeaderCells[iIndexTeams] = {
					name: aTeams[iIndexTeams],
					isColumnHead: true,
					mailto: "",
				};
			}
			oTeamData["rows"].unshift({
				cells: aColumnHeaderCells
			});
			return oTeamData;
		},

		fnReadStaffingSuccess: function (oTeamData, oLookupGroups) {
			var sTeamLoadCmp = this.getModel("teams").getProperty("/loadComplete");
			var sStaffLoadComp = this.getModel("staffInit").getProperty("/loadComplete");
			if (!sTeamLoadCmp || !sStaffLoadComp) {
				return;
			}
			var aResults = this.getModel("staffInit").getProperty("/results");
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
							Startdate: formatter.removeTimeOffset(aResults[iIndexResults].Startdate),
							Enddate: formatter.removeTimeOffset(aResults[iIndexResults].Enddate),
							Customer: aResults[iIndexResults].Customer,
							Customerid: aResults[iIndexResults].Customerid,
							Effort: aResults[iIndexResults].Effort,
							Headerdescription: aResults[iIndexResults].Headerdescription,
							Itemdescription: aResults[iIndexResults].Itemdescription,
							Calloffincl: aResults[iIndexResults].Calloffincl,
							ItemGuid: aResults[iIndexResults].ItemGuid,
							// mapping Details
							InternalOrder: aResults[iIndexResults].InternalOrder,
							TaskType: aResults[iIndexResults].TaskType,
							StaffFraction: aResults[iIndexResults].StaffFraction,
							IoDescription: aResults[iIndexResults].IoDescription,
							WeTeamFlag: aResults[iIndexResults].WeTeamFlag,
							DisplayOnBm: aResults[iIndexResults].DisplayOnBm,
							StaffingManager: aResults[iIndexResults].StaffingManager,
							StaffMngrName: aResults[iIndexResults].StaffMngrName,
							FlexPosNo: aResults[iIndexResults].FlexPosNo,
							SendingUnit: aResults[iIndexResults].SendingUnit,
							UsageType: (aResults[iIndexResults].UsageType === "MANDATORY") ? "" : "(Optional)",
							RespCountry: aResults[iIndexResults].RespCountry,
						//	UsageType: aResults[iIndexResults].UsageType
							Staff_Check: (aResults[iIndexResults].Staff_Check === "") ? "Error" : "None" 
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
							//Assignment Details
							Asgnguid: aResults[iIndexResults].Asgnguid,
							Assignmentstartdate: formatter.removeTimeOffset(aResults[iIndexResults].Assignmentstartdate),
							Assignmentenddate: formatter.removeTimeOffset(aResults[iIndexResults].Assignmentenddate),
							Startdate: formatter.removeTimeOffset(aResults[iIndexResults].Startdate),
							Enddate: formatter.removeTimeOffset(aResults[iIndexResults].Enddate),
							ItemGuid: aResults[iIndexResults].ItemGuid,
							Customer: aResults[iIndexResults].Customer,
							Customerid: aResults[iIndexResults].Customerid,
							Effort: aResults[iIndexResults].Effort,
							Headerdescription: aResults[iIndexResults].Headerdescription,
							Itemdescription: aResults[iIndexResults].Itemdescription,
							Calloffincl: aResults[iIndexResults].Calloffincl,
							// Customer Escalation records
							custEscCount : aResults[iIndexResults].custEscCount,
							custEscIDs : aResults[iIndexResults].custEscIDs,
							custEscSys_id : aResults[iIndexResults].custEscSys_id,
							// mapping Details
							InternalOrder: aResults[iIndexResults].InternalOrder,
							TaskType: aResults[iIndexResults].TaskType,
							StaffFraction: aResults[iIndexResults].StaffFraction,
							IoDescription: aResults[iIndexResults].IoDescription,
							WeTeamFlag: aResults[iIndexResults].WeTeamFlag,
							DisplayOnBm: aResults[iIndexResults].DisplayOnBm,
							StaffingManager: aResults[iIndexResults].StaffingManager,
							StaffMngrName: aResults[iIndexResults].StaffMngrName,
							FlexPosNo: aResults[iIndexResults].FlexPosNo,
							SendingUnit: aResults[iIndexResults].SendingUnit,
							UsageType: (aResults[iIndexResults].UsageType === "MANDATORY") ? "" : "(Optional)",
							RespCountry: aResults[iIndexResults].RespCountry,
						//	UsageType: aResults[iIndexResults].UsageType
							Staff_Check: (aResults[iIndexResults].Staff_Check === "") ? "Error" : "None" 
						});
					}
					oTeamData["rows"][aIndices[0] + 1]["cells"][aIndices[1]]["mailto"] += aResults[iIndexResults].Email_Address + "; ";
					oTeamData["rows"][0]["cells"][aIndices[1]]["mailto"] += aResults[iIndexResults].Email_Address + "; ";
				}
			}
			// return oTeamData;
			this.setMatrixData(oTeamData);
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
			sMailtoString = sMailtoString.replace('; ;', ';');
			if (sMailtoString.length > 1)
				sap.m.URLHelper.triggerEmail(sMailtoString);
		},
		onPressHeadMail: function (oEvent) {
			var sMailtoString = oEvent.getSource().getBindingContext("StaffHeaderModel").getObject().mailto;
			sMailtoString = sMailtoString.replace('; ;', ';');
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
		handleEscPopup : function(oEvent){
			var oButton = oEvent.getSource();
			var sEsc = oEvent.getSource().getCustomData()[0].getValue();
			var sDateJson = this.getEscSystemList(sEsc);
			this.setModel(new JSONModel(),"EscSystem");
			this.getModel("EscSystem").setJSON(sDateJson);
			Fragment.load({
                name : "sap.support.boost.fragment.custEscDialog",
                controller : this
                }).then(function(_ocusEscDialog){
                   this._custEscDialog = _ocusEscDialog;
                   this._custEscDialog = sap.ui.xmlfragment("sap.support.boost.fragment.custEscDialog", this);
	               this._custEscDialog.setModel(this.getModel("EscSystem"), "EscSystemID");
	               this._custEscDialog.open();
                }.bind(this));
		},
		getEscSystemList : function(str){
			var aRaw = str;
			var aJson = [];
			aRaw.forEach(function (val) {
				if (val) {
					var sFullId = val.replace(/\s*/g, "");
					var sShortId = this._extractShortEscSysId(sFullId);
					sFullId = sFullId.split("-")[1];
					var sJson = "{\"incId\":" + "\""  + sShortId + "\", \"fullIncId\":" + "\"" + sFullId + "\"" + "}";
					aJson.push(sJson);
				}
			}.bind(this));
			var sDateJson = "[" + aJson.toString() + "]";
			return sDateJson;
		},
		_extractShortEscSysId : function(str){
				if (str.length == 24) {
				var aRes = str.slice(10).split("");
				aRes.splice(10, 0, "/");
				return aRes.join("").replace(/\b(0+)/gi, "");
			} else {
				return str;
			}
		},
		handleEscSysPress : function(oEvent){
			var sId = oEvent.getSource().getCustomData()[0].getValue();
			//Prod Url = "https://itsm.services.sap/now/workspace/agent/record/sn_customerservice_escalation/89368a18dbfb7414676a1c7505961970";
			//Test Url = "https://test.itsm.services.sap/now/workspace/agent/record/sn_customerservice_escalation/016a74a9dbfa30d0d85e660cd396196b";
			var windowUrl = window.location.href;
			if(windowUrl.includes("sapitcloudt")){
				window.open("ht" + "tps://test.itsm.services.sap/now/workspace/agent/record/sn_customerservice_escalation/" + sId)
			}else{
			window.open("ht" + "tps://itsm.services.sap/now/workspace/agent/record/sn_customerservice_escalation/" + sId);
			}
		},
		hanldcustEscDialogClose : function(oEvent){
			this._custEscDialog.close();
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
				this._oPopover.bindElement(oButton.oBindingContexts.StaffModel.sPath);
				this._oPopover.setModel(oButton.oBindingContexts.StaffModel.getModel());
				this.getView().addDependent(this._oPopover);
				var sPath = oButton.oBindingContexts.StaffModel.sPath;
				var path = [];
				path = sPath.split("/");
				this.oSeat = oButton.oBindingContexts.StaffModel.getModel().oData.rows[path[2]].cells[path[4]].members[path[6]];
				//Hide the Create/Modify/Delete button if DisplauOnBm id H(hide)
				//Hide the button for some wanted seates/roles
				if(this.oSeat.DisplayOnBm === 'H'){
					this._oPopover.getContent()[0].getItems()[2].getContentMiddle()[3].setVisible(false);
				}else{
					this._oPopover.getContent()[0].getItems()[2].getContentMiddle()[3].setVisible(true);
				}
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
			oEvent.getSource().getParent().getParent().getItems()[1].getItems()[1].firePress();
		},
		handlePressTelIcon: function (oEvent) {
			oEvent.getSource().getParent().getParent().getItems()[1].getItems()[2].firePress();
		},
		handlePressMobIcon: function (oEvent) {
			oEvent.getSource().getParent().getParent().getItems()[1].getItems()[3].firePress();
		},
		handlePressAssign: function (oEvent) {
			if (!this._actionSheet) {
				this._actionSheet = new sap.ui.xmlfragment("sap.support.boost.fragment.CreateModifyActionSheet", this);
				this.getView().addDependent(this._actionSheet);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._actionSheet);
			}
			var sRegion = this.getView().getModel("selectedKey").getProperty("/region");
			if (!this.oSeat.Asgnguid) {
				if(!(this.oSeat.FlexPosNo && this.oSeat.SendingUnit && this.oSeat.RespCountry) && !(sRegion === "SAP VPR")){
					sap.m.MessageBox.warning("You can't staff this item due to missing technical setup requirements.\n Please contact your BOOST responsible.");
					return;
				}else{
				sap.ui.getCore().getElementById("btn_modify").setVisible(false);
				sap.ui.getCore().getElementById("btn_delete").setVisible(false);
				this.onCreateAssignment(oEvent);
				}
			} else {
				sap.ui.getCore().getElementById("btn_create").setVisible(false);
				sap.ui.getCore().getElementById("btn_modify").setVisible(true);
				sap.ui.getCore().getElementById("btn_delete").setVisible(true);
				this._actionSheet.openBy(oEvent.getSource());
			}
			var resItem = this.oSeat.serviceItem;
		//	var sRegion = this.getView().getModel("selectedKey").getProperty("/region");
			this.getView().getModel("default").read("/Mapping(Region='" + sRegion + "',ItemNumber='" + resItem + "')", {
				success: function (oData) {
					this.getView().getModel('MappingData').setProperty("/results", oData);

				}.bind(this)
			});
			var urlParams = "$filter=Region eq '" + sRegion + "'" + "and ItemNumber eq '" + resItem + "'";
			this.getModel("default").read("/SuggestResourceListSet", {
				urlParameters: urlParams,
				success: function (oData) {
					oData.results = Array.from(new Set(oData.results.map(a => a.EmpId))).map(EmpId => {
						return oData.results.find(a => a.EmpId === EmpId)
					});
					this.getView().getModel("SuggestListData").setData(oData);
				}.bind(this)
			});
			this.getView().getModel("resReq").read("/ResDemandSet('" + this.oSeat.ItemGuid + "')");

		},

		onCreateAssignment: function (oEvent) {
			var oCopyRecord = $.extend({}, this.oSeat);
			oCopyRecord.firstName = "";
			oCopyRecord.lastName = "";
			oCopyRecord.role = "";
			oCopyRecord.Assignmentstartdate = "";
			oCopyRecord.Assignmentenddate = "";
			oCopyRecord.Asgnguid = "";
			oCopyRecord.employeeId = "";

			var UnAssignDemand = [];
			UnAssignDemand.push(oCopyRecord);
			this.editmode = false;

			this.getView().getModel("AssigndDemand").setProperty("/results", UnAssignDemand);
			this.getView().setModel(this.getOwnerComponent().getModel("resReq"));

			this.aFilter = [];
			var oButton = oEvent.getSource();
			this.AssignmentDialog(oButton);
			var arr = [];
			var that = this;
			var oData = this.getView().getModel("DemandID").getData();
			arr = oData.filter(function (item) {
				return (item.Service_Item_Id == that.oSeat.serviceItem &&
					item.Asgnguid != "");
			});
			this.getView().getModel("DemandID").setData(arr);
		},

		onModifyAssignment: function (oEvent) {
			/*var oCopyRecord = $.extend({}, this.oSeat);
			var AssignDemand = [];
			AssignDemand.push(oCopyRecord);

			this.getView().getModel("AssigndDemand").setProperty("/results", AssignDemand);
			this.getView().setModel(this.getOwnerComponent().getModel("resReq"));

			var oButton = oEvent.getSource();
			this.editmode = true;
			this.AssignmentDialog(oButton);
			var arr = [];
			var that = this;
			var oData = this.getView().getModel("DemandID").getData();
			arr = oData.filter(function (item) {
				return (item.Service_Item_Id == that.oSeat.serviceItem &&
					item.Asgnguid != that.oSeat.Asgnguid);
			});
			this.getView().getModel("DemandID").setData(arr);*/
			// implemented if modify Day or Range
			var oCopyRecord = $.extend({}, this.oSeat);
			sap.m.MessageBox.show("Could You Please Select The Option, Which One You Want To Go For \n\n Description: \n" 
								 + " 1.Alter/Edit - You can alter only Assignment Dates but you can't change the person.  \n "
								  + " 2.Replace - You can Add/Replace the person and also you can modify Dates even.", {
				title: "Modify Assignment",
				icon: sap.m.MessageBox.Icon.INFORMATION,
				actions: ["Alter/Edit", "Replace", sap.m.MessageBox.Action.CANCEL],
				onClose: function (oAction) {
					var AssignDemand = [];
					var oButton = oEvent.getSource();
					var arr = [];
					var that = this;
					var oData = this.getView().getModel("DemandID").getData();
					if (oAction === "Alter/Edit") {
						this.action = "Modify";
						AssignDemand.push(oCopyRecord);
						this.getView().getModel("AssigndDemand").setProperty("/results", AssignDemand);
						this.getView().setModel(this.getOwnerComponent().getModel("resReq"));
						this.editmode = true;
						this.AssignmentDialog(oButton);
						arr = oData.filter(function (item) {
							return (item.Service_Item_Id == that.oSeat.serviceItem &&
								item.Asgnguid != that.oSeat.Asgnguid);
						});
						this.getView().getModel("DemandID").setData(arr);
					} else if (oAction === "Replace") {
						this.action = "Replace";
						AssignDemand.push(oCopyRecord);
						this.getView().getModel("AssigndDemand").setProperty("/results", AssignDemand);
						this.getView().setModel(this.getOwnerComponent().getModel("resReq"));
						this.editmode = true;
						this.AssignmentDialog(oButton);
						arr = oData.filter(function (item) {
							return (item.Service_Item_Id == that.oSeat.serviceItem &&
								item.Asgnguid != that.oSeat.Asgnguid);
						});
						this.getView().getModel("DemandID").setData(arr);
					}
				}.bind(this)
			});
		},

		onDeleteAssignment: function (oEvent) {
			var that = this;
			/*	Promise.all([this._onDeleteAssignment()]).then(function () {
					return that.readInternalOrder();
				}.bind(that)).then(function () {
					return that.readStaffDetailsISP();
				}.bind(that)).then(function () {
					return that.oDeleteIO();
				}.bind(that)).catch(function (oError) {});*/

			// Only IC call for Deletion
			var dBegDate = this.oSeat.Assignmentstartdate;
			var dEndDate = this.oSeat.Assignmentenddate;
			var inputDate = this.getView().getModel("datePick").getData().date;
			inputDate.setHours(this.oSeat.Assignmentstartdate.getHours());

		/*	if (this.getDateString(inputDate) < this.getDateString(new Date())) {
				sap.m.MessageBox.error("You can not delete past assignments");
				return;
			}*/
			
			// Allow deletion of assignment current and past week
			//not before past weeks
			var oJan = new Date(new Date().getFullYear(),0,1);
				var today = new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
				var daysOfyear = Math.floor((today - oJan ) / (24*60*60*1000));
				var currentWeek = Math.ceil(daysOfyear / 7);

				var selectedDate = inputDate;
				var daysOfYearselectedDate = Math.floor((selectedDate - oJan ) / (24*60*60*1000));
				var selectedtWeek = Math.ceil(daysOfYearselectedDate / 7);
			if (currentWeek-1>selectedtWeek) {	
			    sap.m.MessageBox.warning("Current Week is"+" "+currentWeek+"\n Selected Date week is"+" "+selectedtWeek+" "+"and Date is"+" "+
			    this.formatter.fnParseDateCompare(inputDate) +
			    "\n You can not delete the before past week Assignments...");		
					return;
			}

			sap.m.MessageBox.confirm("Do you really want to Delete Assignment \n\n Note: \n" +
				"1.  " + "'" + "Single Day" + "'" + " " + "option to delete current selection. \n" +
				"2.  " + "'" + "Range" + "'" + " " + " to delete the rest of the week. \n", {
					title: "Delete Assignment",
					styleClass: "sapUiSizeCompact",
					actions: ["Single Day", "Range", sap.m.MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction === "Single Day") {
							this.getView().setBusy(true);
							this.deleteAction = "D";
							var sRegion = this.getView().getModel("selectedKey").getProperty("/region");
							var sUrl = ["Region='" + sRegion + "'&AssGuid='" + this.oSeat.Asgnguid + "'&ItemGuid='" + this.oSeat.ItemGuid +
								"'&EndTstmp=datetime'" + this.formatterReuse.removeTimeOffset(inputDate).toJSON().split(".")[0] + "'&BegTstmp=datetime'" +
								this.formatterReuse.removeTimeOffset(inputDate).toJSON().split(".")[0] +
								"'&Indicator='" + this.deleteAction + "'&EmpId='" + this.oSeat.employeeId + "'"
							];
							this.getView().getModel("default").read("/Assignment_del_FI", {
								urlParameters: sUrl,
								success: function (oResponse) {
									this.getView().setBusy(false);
									var oresults = oResponse.results;
									var msgResponce = [];
									var msgResponceRfc = [];
									for (var i = 0; i < oresults.length; i++) {
										if (oresults[i].Gwmsg) {
											msgResponce.push(oresults[i].Gwmsg + "\n");
										}
										if (oresults[i].Gwmsg1) {
											msgResponce.push(oresults[i].Gwmsg1 + "\n");
										}
										if (oresults[i].Gwmsg2) {
											msgResponce.push(oresults[i].Gwmsg2 + "\n");
										}
										if (oresults[i].GwmsgRfc) {
											msgResponceRfc.push(oresults[i].GwmsgRfc);
										}
									}
									if (oresults.length > 0) {
										sap.m.MessageBox.success("Deleted Successfully and" + "\n" + msgResponce + "\n" + msgResponceRfc, {
											title: "Success"
										});
									}
								//	sap.m.MessageToast.show(i18n.getText("MSG_ASG_DELETED_SUCCESS"));
									this._oPopover.close();
									this.trackEvent(this.getOwnerComponent(),this.DELETE_ASSIGNMENTS);
									this.getEventBus().publish("day", "getDayStaffing");
								}.bind(this),
								error: function (oResponse) {
									this.getView().setBusy(false);
									this._oPopover.close();
									this.getEventBus().publish("day", "getDayStaffing");
								//	sap.m.MessageBox.error(JSON.parse(oResponse.responseText).error.message.value);
									that._updateWorkListWithSavedRecord(this.oSeat.ItemGuid);
									that._displayAssignmentFailureDialogOnErrorResponse(oResponse);
								}.bind(this)
							});
						} else if (oAction === "Range") {
							var deletionRangeAssignment = [];
							var oAssignment = this.oSeat;
							//	oAssignment.BegDate = oAssignment.Assignmentstartdate;
							oAssignment.BegDate = this.getView().getModel("datePick").getData().date;
							oAssignment.EndDate = oAssignment.Assignmentenddate;
							oAssignment.StartTime = this._convertZeroTimestamp(oAssignment.Assignmentstartdate);
							oAssignment.EndTime = this._convertZeroTimestamp(oAssignment.Assignmentenddate);
							deletionRangeAssignment.push(oAssignment);
							this.deletionrangeData = new JSONModel(deletionRangeAssignment);
							this.getView().setModel(this.deletionrangeData, "WorklistDemandsToStaff");
							this.getView().setModel(this.getOwnerComponent().getModel("resReq"));
							this.getView().setModel(this.getOwnerComponent().getModel("default"));

							if (!this.deleteDialogRange) {
								this.deleteDialogRange = new sap.ui.xmlfragment("sap.support.boost.fragment.DeleteAssignmentRange", this);
								this.getView().addDependent(this.deleteDialogRange);
								jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this.deleteDialogRange);
							}
							this.deleteDialogRange.open();
							/*this.getView().setBusy(true);
							this.deleteAction = "R";
							var sRegion = this.getView().getModel("selectedKey").getProperty("/region");
							var sUrl = ["Region='" + sRegion + "'&AssGuid='" + this.oSeat.Asgnguid + "'&ItemGuid='" + this.oSeat.ItemGuid +
								"'&EndTstmp=datetime'" + this.formatterReuse.removeTimeOffset(dEndDate).toJSON().split(".")[0] + "'&BegTstmp=datetime'" +
								this.formatterReuse.removeTimeOffset(inputDate).toJSON().split(".")[0] +
								"'&Indicator='" + this.deleteAction + "'&EmpId='" + this.oSeat.employeeId + "'"
							];
							this.getView().getModel("default").read("/Assignment_del_FI", {
								urlParameters: sUrl,
								success: function (oResponse) {
									this.getView().setBusy(false);
									var oresults = oResponse.results;
									var msgResponce = [];
									var msgResponceRfc = [];
									for (var i = 0; i < oresults.length; i++) {
										if (oresults[i].Gwmsg) {
											msgResponce.push(oresults[i].Gwmsg + "\n");
										} else {
											msgResponceRfc.push(oresults[i].GwmsgRfc);
										}
									}
									if (oresults.length > 0) {
										sap.m.MessageBox.success("Deleted Successfully and" + "\n" + oresults[0].Gwmsg + "\n" + oresults[0].GwmsgRfc, {
											title: "Success"
										});
									}
									sap.m.MessageToast.show(i18n.getText("MSG_ASG_DELETED_SUCCESS"));
									this._oPopover.close();
									this.getEventBus().publish("day", "getDayStaffing");
								}.bind(this),
								error: function (oResponse) {
									this.getView().setBusy(false);
									this.getEventBus().publish("day", "getDayStaffing");
									sap.m.MessageBox.error(oResponse.responseText);
									that._updateWorkListWithSavedRecord(oResponse.ItemGuid);
									that._displayAssignmentFailureDialogOnErrorResponse(oResponse);
								}.bind(this)
							});*/
						}
					}.bind(this)
				});
		},

		_onDeleteAssignment: function () {
			return new Promise(function (resolve, reject) {
				var dBegDate = this.oSeat.Assignmentstartdate;
				var dEndDate = this.oSeat.Assignmentenddate;

				var that = this;

				sap.m.MessageBox.confirm("Do you really want to Delete Assignment", {
					title: "Delete Assignment",
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction === sap.m.MessageBox.Action.YES) {
							this.getView().getModel("resReq").remove("/AssignmentList(EmpID='" + this.oSeat.employeeId + "',BegDate=datetime'" +
								dBegDate
								.toJSON()
								.split(".")[0] + "',EndDate=datetime'" + dEndDate.toJSON().split(".")[0] + "',AsgnGuid='" + this.oSeat.Asgnguid + "')", {
									success: function () {
										sap.m.MessageToast.show(i18n.getText("MSG_ASG_DELETED_SUCCESS"));
										this._oPopover.close();
										this.getEventBus().publish("day", "getDayStaffing");
										resolve();
									}.bind(this),
									error: function (oResponse) {
										that._updateWorkListWithSavedRecord(oResponse.ItemGuid);
										that._displayAssignmentFailureDialogOnErrorResponse(oResponse);
										reject();
									}
								});
						} else {
							reject();
						}
					}.bind(this)
				});
			}.bind(this));
		},

		_updateWorkListWithSavedRecord: function (sItemGuid) {
			this.getView().getModel().read("/ResDemandSet('" + sItemGuid + "')");
		},

		_displayAssignmentFailureDialogOnErrorResponse: function (oResponse) {
			var sErrorMsg = JSON.parse(oResponse.responseText);
			var sItemGuid = sErrorMsg.error.message.value;
			var oDemand = this.getView().getModel('resReq').getProperty("/ResDemandSet('" + this.oSeat.ItemGuid + "')");
			var oOrg = this.getView().getModel('resReq').getProperty("/ResServiceTeamSet('" + oDemand.Organization + "')"),
				aErrorCodes = sErrorMsg.error.innererror.errordetails,
				sErrorMsgDisplay = "";
				var aErrorcodeArray = [];
				if(aErrorCodes){
					for(var  i=0;i<aErrorCodes.length;i++){
						if(aErrorCodes[i].message){
						aErrorcodeArray.push(aErrorCodes[i].message + "\n");
						}
					}
				}else{
					aErrorCodes = " ";
					aErrorcodeArray.push(sItemGuid + "\n Please contact Backoffice");
				}
			sErrorMsgDisplay += ErrorCodeHelper.getMessageForErrorCodes(aErrorCodes, oDemand, oOrg);
			ErrorCodeHelper.displaySoErrorDialog(sErrorMsgDisplay + "\n\n" + aErrorcodeArray);

		},

		readStaffDetailsISP: function () {
			return new Promise(function (resolve, reject) {
				var that = this;
				sap.support.boost.ISModel.setUseBatch(false);
				var InternalOrder = this.getView().getModel("IODetails").getProperty("/InternalOrd");
				sap.support.boost.ISModel.read("/InternalOrderHeaderSet('" + InternalOrder + "')", {
					urlParameters: {
						"$expand": "OrderHeaderStaffingRes"
					},
					success: function (oData) {
						if (oData.OrderHeaderStaffingRes.results.length > 0) {
							that.getView().setBusy(true);
							that.reqData = undefined;
							oData.OrderHeaderStaffingRes.results.forEach(function (x) {
								if (that.getDateString(x.Begda) === that.getDateString(that.oSeat.Assignmentstartdate) &&
									that.getDateString(x.Endda) === that.getDateString(that.oSeat.Assignmentenddate) &&
									x.UserId === that.oSeat.employeeId) {
									that.reqData = {
										"Actexp": "A",
										"ActexpStr": "Activities",
										"Action": "6",
										"Begda": x.Begda,
										"BegdaStr": x.Begda ? that.getDateString(x.Begda) : '00000000',
										"Bukrs": "0001",
										"CostObjType": "IO",
										"CreatedBy": x.CreatedBy,
										"CreatedOn": x.CreatedOn,
										"Endda": x.Endda,
										"EnddaStr": x.Endda ? that.getDateString(x.Endda) : '00000000',
										"EntryId": x.EntryId,
										"Ethrs": "0",
										"LastChangedBy": x.LastChangedBy,
										"LastChangedOn": x.LastChangedOn,
										"Name": x.Name,
										"Objnr": x.Objnr,
										"Pdays": x.Pdays,
										"Pernr": x.Pernr,
										"PernrStr": x.Pernr,
										"Posnr": "000000",
										"Pthrs": "0.0",
										"ReadOnly": false,
										"Snote": x.Snote,
										"Status": "",
										"StatusStr": "",
										"TaskLevel": "",
										"TaskLevelStr": "",
										"Tasktype": "",
										"TasktypeStr": "",
										"Trtkl": "",
										"TrtklStr": "",
										"UIM_INFO": "",
										"UserId": x.UserId,
										"UserType": "",
										"UsrRole": "",
										"Vbeln": x.Vbeln,
										"Zzcontpers": ""
									};
								}
							});
							if (that.reqData) {
								that.getView().setBusy(false);
								resolve();
							} else {
								that.getView().setBusy(false);
								reject();
							}
						} else {
							reject();
						}
					},
					error: function (oData) {
						that.getView().setBusy(true);
						reject();
					}
				});
			}.bind(this));
		},

		readInternalOrder: function () {
			return new Promise(function (resolve, reject) {
				var that = this;
				var resItem = this.oSeat.serviceItem;
				var sRegion = this.getView().getModel("selectedKey").getProperty("/region");

				this.getView().getModel("default").read("/Mapping(Region='" + sRegion + "',ItemNumber='" + resItem + "')", {
					success: function (oData) {
						if (!oData.InternalOrder) {
							reject();
						} else {
							that.getView().getModel("IODetails").setProperty("/InternalOrd", oData.InternalOrder);
							that.getView().getModel("IODetails").setProperty("/StaffFactor", oData.StaffFraction);
							resolve();
						}
					}.bind(this),

					error: function (error) {
						reject();
					}
				});
			}.bind(this));
		},

		AssignmentDialog: function (oButton) {
			this._sFragmentId = this.getView().getId() + "--" + "AssignmentFrag";
			if (!this._oDemandPop) {
				Fragment.load({
					name: "sap.support.boost.fragment.AssignTab",
					id: this._sFragmentId,
					controller: this
				}).then(function (DemandPop) {
					this._oDemandPop = DemandPop;
					this.getView().addDependent(this._oDemandPop);
					this.oTable = Fragment.byId(this._sFragmentId, "AssignmentTab");
					//	this.oList = Fragment.byId(this._sFragmentId, "idBufferingList");
					this.oTable.getBinding("items");
					//	this.oList.getBinding("items");
					//  edit mode and selected Alter/Edit(Modify) than need to show the userid in employee search
					if (this.oSeat.Asgnguid) {
					if (this.action === "Modify") {
							this.onSuggestListPress();
							var oInputModel = this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0];
							oInputModel.setValue(this.oSeat.employeeId);
							oInputModel.setEditable(false);
							this._oDemandPop.getContent()[2].setVisible(false);
							this._oDemandPop.getContent()[1].setVisible(false);
						}
						if(this.action === "Replace"){
							var oInputModel = this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0];
							oInputModel.setValue("");
							oInputModel.setEditable(true);
							this._oDemandPop.getContent()[2].setVisible(true);
							this._oDemandPop.getContent()[1].setVisible(true);
						}
					} else{
						var oInputModel = this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0];
							oInputModel.setValue("");
							oInputModel.setEditable(true);
							this._oDemandPop.getContent()[2].setVisible(true);
							this._oDemandPop.getContent()[1].setVisible(true);
					}
					this._oDemandPop.addStyleClass("sapUiSizeCompact");
					this._oDemandPop.open(oButton);
				}.bind(this));
			} else {
				this.oTable.getBinding("items").filter(this.aFilter);
				//	this.oList.getBinding("items").filter(this.aFilter);
				// edit mode and selected Alter/Edit(Modify) than need to show the userid in employee search
				if (this.oSeat.Asgnguid) {
					if (this.action === "Modify") {
						this.onSuggestListPress();
						var oInputModel = this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0];
						oInputModel.setValue(this.oSeat.employeeId);
						oInputModel.setEditable(false);
						this._oDemandPop.getContent()[2].setVisible(false);
						this._oDemandPop.getContent()[1].setVisible(false);
					}
					if(this.action === "Replace"){
							var oInputModel = this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0];
							oInputModel.setValue("");
						oInputModel.setEditable(true);
						this._oDemandPop.getContent()[2].setVisible(true);
						this._oDemandPop.getContent()[1].setVisible(true);
						}
				} else{
					var oInputModel = this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0];
							oInputModel.setValue("");
							oInputModel.setEditable(true);
							this._oDemandPop.getContent()[2].setVisible(true);
							this._oDemandPop.getContent()[1].setVisible(true);
				}
				this._oDemandPop.addStyleClass("sapUiSizeCompact");
				this._oDemandPop.open();
			}
		},

		closeDialog: function (oEvent) {
			this._oDemandPop.close();
			this._oPopover.close();
			this.getView().setModel(this.getOwnerComponent().getModel("default"));
		},

		onAssignItems: function () {
			
			this.getView().getModel("resReq").read("/ResDemandSet('" + this.oSeat.ItemGuid + "')");
			var aTableItems = this.oTable.getAggregation("items"),
				iAssignColumn = Fragment.byId(this._sFragmentId, "assignResCol").getInitialOrder(),
				aDemandsToStaff = [],
				that = this,
				sRegion = this.getView().getModel("selectedKey").getProperty("/region");
			var resItem = this.oSeat.serviceItem;

			for (var i = 0; i < aTableItems.length; i++) {
				// Getting sap.m.MultiInput from EmployeeSelect column position in HBox
			//	var oRowEmpInput = aTableItems[i].getCells()[iAssignColumn].getItems()[0].getFragment();
				var oRowEmpInput = aTableItems[i].getCells()[iAssignColumn].getItems()[0];
				// Check if assignment input is visible and contains a value
				if (oRowEmpInput.getValue()) {
					var oAssignment = that.getView().getModel("AssigndDemand").getProperty(aTableItems[i].getBindingContextPath());

					if (this.editmode) {
						oAssignment.BegDate = oAssignment.Assignmentstartdate;
						oAssignment.EndDate = oAssignment.Assignmentenddate;
						oAssignment.StartTime = this._convertZeroTimestamp(oAssignment.Assignmentstartdate);
						oAssignment.EndTime = this._convertZeroTimestamp(oAssignment.Assignmentenddate);
						oAssignment.EditMode = true;
						oAssignment.action = this.action;
					} else {
						if (sRegion == "APJ BACKOFFICE") {
							var dBegTstmp = oAssignment.Startdate,
								dEndTstmp = oAssignment.Enddate;
							dBegTstmp.setHours(8, 0);
							oAssignment.StartTime = dBegTstmp;
							dEndTstmp.setHours(17, 0);
							oAssignment.EndTime = dEndTstmp;
							oAssignment.BegDate = oAssignment.Startdate;
							oAssignment.EndDate = oAssignment.Enddate;
						} else {
							oAssignment.BegDate = oAssignment.Startdate;
							oAssignment.EndDate = oAssignment.Enddate;
							oAssignment.StartTime = this._convertZeroTimestamp(oAssignment.Startdate);
							oAssignment.EndTime = this._convertZeroTimestamp(oAssignment.Enddate);
						}
				// Selection checking the checkBoxes if weekdays than selection is true mon,tue,wed,thu,fri
				//if weekend selection than sat,sun only true (this functionality is only working in creation time)
				//	var oDatsInterval = this.formatter.fnParseDate(oAssignment.Enddate) - this.formatter.fnParseDate(oAssignment.Startdate);
						if(!oAssignment.WeTeamFlag){
						oAssignment.EditMode = false;
						oAssignment.Monday = true;
						oAssignment.Tuesday = true;
						oAssignment.Wednusday = true;
						oAssignment.Thursday = true;
						oAssignment.Friday = true;
						oAssignment.Saturday = false;
						oAssignment.Sunday = false;
						}else{
						oAssignment.EditMode = false;
						oAssignment.Monday = false;
						oAssignment.Tuesday = false;
						oAssignment.Wednusday = false;
						oAssignment.Thursday = false;
						oAssignment.Friday = false;
						oAssignment.Saturday = true;
						oAssignment.Sunday = true;
						}
					}
					oAssignment.Duration = oAssignment.Effort;
					// Retrieve employee values for input model
					oAssignment.CallOff = formatter.toFloat(oAssignment.Calloffincl);
					oAssignment.FullName = this.getView().getModel("AssigndDemand").getData().results[0].FullName;
					oAssignment.Employee = this.getView().getModel("AssigndDemand").getData().results[0].Employee
					oAssignment.ResGuid = this.getView().getModel("AssigndDemand").getData().results[0].ResGuid;
					oAssignment.BindingContext = aTableItems[i].getBindingContextPath();
					// Get Mapping Entity values
					/*if (this.getView().getModel("MappingData").getData().results) {
						oAssignment.TaskType = this.getView().getModel("MappingData").getData().results.TaskType;
						oAssignment.InternalOrder = this.getView().getModel("MappingData").getData().results.InternalOrder;
						oAssignment.StaffFraction = this.getView().getModel("MappingData").getData().results.StaffFraction;
					}*/
					//Get Mapping Details from staffing call
					oAssignment.InternalOrder = oAssignment.InternalOrder;
					oAssignment.IoDescription = oAssignment.IoDescription;
					oAssignment.TaskType = oAssignment.TaskType;
					oAssignment.StaffFraction = Number(oAssignment.StaffFraction).toFixed(1);
					oAssignment.StaffingManager = oAssignment.StaffingManager;
					oAssignment.StaffMngrName = oAssignment.StaffMngrName;
					aDemandsToStaff.push(oAssignment);
				}
			}

			if (aDemandsToStaff.length > 0) {
				if (oAssignment.ResGuid) {
					if (oRowEmpInput.getValue() != oAssignment.Employee) {
						sap.m.MessageToast.show(i18n.getText("MSG_ENTER"));
					} else {
						var mWorklistItems = new JSONModel(aDemandsToStaff);
						if (this.getView().getModel("WorklistDemandsToStaff")) {
							this.getView().getModel("WorklistDemandsToStaff").destroy();
						}
						this.getView().setModel(mWorklistItems, "WorklistDemandsToStaff");
						this.getView().setModel(this.getOwnerComponent().getModel("resReq"));
						this.getView().setModel(this.getOwnerComponent().getModel("default"));

						if (!this._assignWorklistItems) {
							this._assignWorklistItems = helpers.initializeFragmentFromObject({
								oParentController: this,
								sFragment: "sap.support.boost.fragment.AssignWorklistDemand",
								ControllerClass: AssignWorklistDemandController,
								sCreateId: this.getView().createId("idForAssignWorklistDemandDialog")
							});
						}
					//	if (!oAssignment.TaskType) {
							this._assignWorklistItems.byId("idtasktypeEdit").setProperty("editable", true);
							this._assignWorklistItems.byId("idtasktypeEdit").setProperty("visible", true);
							var taskTypeData = {
								"items": [{
									"TaskType": "BOD"
								}, {
									"TaskType": "ESCA"
								}, {
									"TaskType": "ICON"
								}, {
									"TaskType": "ICOS"
								}, {
									"TaskType": "STBY"
								}]
							};
							var ojsonTasktype = new sap.ui.model.json.JSONModel(taskTypeData);
							var comboBox = this._assignWorklistItems.byId("idtasktypeEdit");
							var oItemTemplate = new sap.ui.core.Item({

								text: "{TaskType}"
							});
							comboBox.setModel(ojsonTasktype);
							comboBox.bindItems("/items", oItemTemplate);
					//	} else {
							this._assignWorklistItems.byId("idtasktypeEdit").setProperty("visible", true);
							this._assignWorklistItems.byId("idtasktypeEdit").setProperty("editable", true);
							this._assignWorklistItems.byId("idtasktypeEdit").addStyleClass("sapUiTinyMarginTop");
					//	}
					//
						var fractionData = {
								"items": [{
									"StaffFraction": "1.0"
								}, {
									"StaffFraction": "0.9"
								}, {
									"StaffFraction": "0.8"
								}, {
									"StaffFraction": "0.7"
								}, {
									"StaffFraction": "0.6"
								}, {
									"StaffFraction": "0.5"
								}, {
									"StaffFraction": "0.4"
								}, {
									"StaffFraction": "0.3"
								}, {
									"StaffFraction": "0.2"
								},{
									"StaffFraction": "0.1"
								},{
									"StaffFraction": "0.0"
								}]
							};
							var ojsonFraction = new sap.ui.model.json.JSONModel(fractionData);
							var comboBox = this._assignWorklistItems.byId("idfraction");
							var oItemTemplateFraction = new sap.ui.core.Item({

								text: "{StaffFraction}"
							});
							comboBox.setModel(ojsonFraction);
							comboBox.bindItems("/items", oItemTemplateFraction);
							this._assignWorklistItems.byId("idfraction").setProperty("visible",true);
							this._assignWorklistItems.byId("idfraction").addStyleClass("sapUiTinyMarginTop");
							
							// IO Details Maintained
							if(!oAssignment.InternalOrder){
								oAssignment.InternalOrder = "IO Number not Maintained";
								oAssignment.IoDescription = "No Description";
								this._assignWorklistItems.byId('idIOdetails').setProperty('text',oAssignment.InternalOrder+" / "+oAssignment.IoDescription);
								this._assignWorklistItems.byId("idtasktypeEdit").setProperty("editable", false);
								this._assignWorklistItems.byId("idfraction").setProperty("editable", false);
								this._assignWorklistItems.byId('idfraction').setRequired(false);
								this._assignWorklistItems.byId('idtasktypeEdit').setRequired(false);
							}else{
								this._assignWorklistItems.byId("idtasktypeEdit").setProperty("editable", true);
								this._assignWorklistItems.byId("idfraction").setProperty("editable", true);
								this._assignWorklistItems.byId('idfraction').setRequired(false);
								this._assignWorklistItems.byId('idtasktypeEdit').setRequired(false);
							}
						/*var oScreenDate = this.getView().getModel("datePick").getData().date;
						if (this.action === "Day" && this.editmode === true) {
							this._assignWorklistItems.byId("begDate").setDateValue(oScreenDate);
							this._assignWorklistItems.byId("endDate").setDateValue(oScreenDate);
							this._assignWorklistItems.byId("begDate").setEditable(false);
							this._assignWorklistItems.byId("endDate").setEditable(false);
						} else if(this.action === "Range" && this.editmode === true){
							this._assignWorklistItems.byId("begDate").setDateValue(oScreenDate);
							this._assignWorklistItems.byId("begDate").setEditable(true);
							this._assignWorklistItems.byId("endDate").setEditable(true);
						}else{
							this._assignWorklistItems.byId("begDate").setEditable(true);
							this._assignWorklistItems.byId("endDate").setEditable(true);
						}*/
						if (this.editmode === true) {
							this._assignWorklistItems.byId("idCheckboxWeekDays").setVisible(false);
						} else {
							this._assignWorklistItems.byId("idCheckboxWeekDays").setVisible(true);
						}
						// show the CET beside of date fileds
						this._assignWorklistItems.byId("idEditTimeAllocationForm").getFormContainers()[0].getFormElements()[9].getLabel().setText("Start Date"); //removed CET text
						this._assignWorklistItems.byId("idEditTimeAllocationForm").getFormContainers()[0].getFormElements()[10].getLabel().setText("End Date"); //removed CET text
						// hiding the time stamps fields
						this._assignWorklistItems.byId("idEditTimeAllocationForm").getFormContainers()[0].getFormElements()[9].getFields()[1].setVisible(true);
						this._assignWorklistItems.byId("idEditTimeAllocationForm").getFormContainers()[0].getFormElements()[10].getFields()[1].setVisible(true);
						// non editatable time stamps
						this._assignWorklistItems.byId("idEditTimeAllocationForm").getFormContainers()[0].getFormElements()[9].getFields()[1].setEditable(true);
						this._assignWorklistItems.byId("idEditTimeAllocationForm").getFormContainers()[0].getFormElements()[10].getFields()[1].setEditable(true);
						this._assignWorklistItems.addStyleClass("sapUiSizeCompact");
						this._assignWorklistItems.open();
					}
				} else {
					sap.m.MessageToast.show(i18n.getText("MSG_ENTER"));
				}
			} else {
				sap.m.MessageToast.show(i18n.getText("MSG_NO_PENDING_ASG"));
			}
		},

		onClear: function () {
			// clear search values
			this.oTable.removeSelections(true);
			var iAssignColumn = Fragment.byId(this._sFragmentId, "assignResCol").getInitialOrder();
			var aTableItems = this.oTable.getAggregation("items");

			for (var i = 0; i < aTableItems.length; i++) {
				var oRowEmpInput = aTableItems[i].getCells()[iAssignColumn].getItems()[0];
				oRowEmpInput.setValue("");
			}
		},
		/**
		 * Add one day to days with timestamp equals to zero.
		 * The calendar of the datepicker is not displayed for this case
		 *  
		 * @public
		 * @param {date} dDate the date
		 * @returns {date} dDate
		 */
		_convertZeroTimestamp: function (dDate) {
			if (dDate.getTime() <= 86340059) {
				dDate.setTime(86400000);
			}
			return dDate;
		},

		oDeleteIO: function () {
			sap.support.boost.ISModel.setUseBatch(true);
			sap.support.boost.ISModel.setDeferredGroups(['ReqDelete']);
			return new Promise(function (resolve, reject) {
				sap.support.boost.ISModel.create("/ReqDetails", this.reqData, {
					groupId: 'ReqDelete',
				});

				sap.support.boost.ISModel.submitChanges({
					groupId: 'ReqDelete',
					success: function (oData) {
						resolve();
					},
					error: function (error) {
						reject();
					}
				});
			}.bind(this));
		},
		getDateString: function (date) {
			var year = date.getFullYear();
			var month = date.getMonth() + 1;
			if (month < 10) {
				var month_append = "0";
			} else {
				var month_append = "";
			}
			var dat = date.getDate();
			if (dat < 10) {
				var dat_append = "0";
			} else {
				var dat_append = "";
			}

			return (year + "" + month_append + "" + month + "" + dat_append + "" + dat);
		},
		onSuggestListPress: function (oEvent) {

			if (oEvent === undefined) {
				var oEmpId = this.oSeat.employeeId;
			} else {
				var oEmpId = oEvent.getSource().getTitle();
			}
			//	var oEmpId = oEvent.getSource().getTitle();
			var oInputModel = this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0];

			var aFilters = [];
			aFilters.push(new sap.ui.model.Filter("BegDate", sap.ui.model.FilterOperator.EQ, new Date()));
			aFilters.push(new sap.ui.model.Filter("EndDate", sap.ui.model.FilterOperator.EQ, new Date()));
			aFilters.push(new sap.ui.model.Filter("EmpId", sap.ui.model.FilterOperator.EQ, oEmpId));

			this.getView().getModel("resReq").read("/ResourceList", {
				filters: aFilters,
				success: function (oResponse) {
					if (oResponse.results.length <= 0) {
						this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0].setValue("");
						sap.m.MessageToast.show("No EmployeeID maintained in employee search Box. Please add EmpID");
						// this.displayNotValidEmployeeDialog(sEmpID);
					} else {
						// Update input value
						var oresponceData = oResponse.results[0];
						var oAssignedData = this.getView().getModel("AssigndDemand").getData().results[0];
						oAssignedData.ResGuid = oresponceData.ResGuid;
						oAssignedData.FullName = oresponceData.FullName;
						oAssignedData.Employee = oresponceData.EmpId;
						oAssignedData.employeeId = oResponse.results[0].EmpId;
						oAssignedData.firstName = oResponse.results[0].FirstName;
						oAssignedData.lastName = oResponse.results[0].LastName;
						this.getView().getModel("AssigndDemand").updateBindings(true);
						this.getView().getModel("AssigndDemand").refresh(true);
					/*	this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0].getFragment().setValue(oResponse.results[0].EmpId);*/
						// Store values in input model
						/*oInputModel.setProperty("/resGuid", oResponse.results[0].ResGuid);
						oInputModel.setProperty("/fullName", oResponse.results[0].FullName);
						oInputModel.setProperty("/empId", oResponse.results[0].EmpId);
						this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0].fireEmployeeChanged({
							"empId": oResponse.results[0].EmpId,
							"resGuid": oResponse.results[0].ResGuid
						});*/
						//this.fireEmployeeChanged({"empId": oResponse.results[0].EmpId, "resGuid": oResponse.results[0].ResGuid});
					}
					//this.oTable.getAggregation('items')[0].getCells()[6].getItems()[0].getFragment().setProperty(oResponse.results[0].EmpId);
				}.bind(this)
			});
		},
		onDeleteRangeAllocation: function (oevent) {
			this.onDatesChanged();
			if (sap.ui.getCore().byId("delbegDate").getValueState() === "Error") {
				sap.m.MessageToast.show("Could you please select valide Date");
				return;
			} else if (sap.ui.getCore().byId("delendDate").getValueState() === "Error") {
				sap.m.MessageToast.show("Could you please select valide Date");
				return;
			}
			var oCurrentAssignmentData = this.getView().getModel("WorklistDemandsToStaff").getData()[0];
			this.getView().setBusy(true);
			this.deleteDialogRange.setBusy(true);
			this.deleteAction = "R";
			var sRegion = this.getView().getModel("selectedKey").getProperty("/region");
			var sUrl = ["Region='" + sRegion + "'&AssGuid='" + this.oSeat.Asgnguid + "'&ItemGuid='" + this.oSeat.ItemGuid +
				"'&EndTstmp=datetime'" + this.formatterReuse.removeTimeOffset(oCurrentAssignmentData.EndDate).toJSON().split(".")[0] +
				"'&BegTstmp=datetime'" +
				this.formatterReuse.removeTimeOffset(oCurrentAssignmentData.BegDate).toJSON().split(".")[0] +
				"'&Indicator='" + this.deleteAction + "'&EmpId='" + this.oSeat.employeeId + "'"
			];
			this.getView().getModel("default").read("/Assignment_del_FI", {
				urlParameters: sUrl,
				success: function (oResponse) {
					this.getView().setBusy(false);
					this.deleteDialogRange.setBusy(false);
					var oresults = oResponse.results;
					var msgResponce = [];
					var msgResponceRfc = [];
					for (var i = 0; i < oresults.length; i++) {
						if (oresults[i].Gwmsg) {
							msgResponce.push(oresults[i].Gwmsg + "\n");
						}
						if (oresults[i].Gwmsg1) {
							msgResponce.push(oresults[i].Gwmsg1 + "\n");
						}
						if (oresults[i].Gwmsg2) {
							msgResponce.push(oresults[i].Gwmsg2 + "\n");
						}
						if (oresults[i].GwmsgRfc) {
							msgResponceRfc.push(oresults[i].GwmsgRfc);
						}
					}
					if (oresults.length > 0) {
						sap.m.MessageBox.success("Deleted Successfully and" + "\n" + msgResponce + "\n" + msgResponceRfc, {
							title: "Success"
						});
					}
				//	sap.m.MessageToast.show(i18n.getText("MSG_ASG_DELETED_SUCCESS"));
					this._oPopover.close();
					this.deleteDialogRange.close();
					this.trackEvent(this.getOwnerComponent(),this.DELETE_ASSIGNMENTS);
					this.getEventBus().publish("day", "getDayStaffing");
				}.bind(this),
				error: function (oResponse) {
					this.getView().setBusy(false);
					this.deleteDialogRange.setBusy(false);
					this.deleteDialogRange.close();
					this.getEventBus().publish("day", "getDayStaffing");
				//	sap.m.MessageBox.error(JSON.parse(oResponse.responseText).error.message.value);
					this._updateWorkListWithSavedRecord(this.oSeat.ItemGuid);
					this._displayAssignmentFailureDialogOnErrorResponse(oResponse);
				}.bind(this)
			});

		},
		onDatesChanged: function () {
			var oCurrentAssignment = this.getView().getModel("WorklistDemandsToStaff").getData()[0];
			AssignmentsWarningHelper.setDatesForAssignment(oCurrentAssignment.BegDate, oCurrentAssignment.EndDate, oCurrentAssignment.StartTime,
				oCurrentAssignment.EndTime);

			//	if (this.oDemand[0].EditMode) {
		/*	if (this.getDateString(oCurrentAssignment.BegDate) < this.getDateString(new Date())) {
				sap.ui.getCore().byId("delbegDate").setValueState("Error");
				sap.ui.getCore().byId("delbegDate").setValueStateText("Select Valid Date...");
				sap.m.MessageBox.warning("You can not Delete past dates..");
				this.getView().getModel("WorklistDemandsToStaff").updateBindings(true);
				this.getView().getModel("WorklistDemandsToStaff").refresh(true);
				return;
			} else if (this.getDateString(oCurrentAssignment.BegDate) > this.getDateString(oCurrentAssignment.EndDate)) {
				sap.ui.getCore().byId("delbegDate").setValueState("Error");
				sap.ui.getCore().byId("delbegDate").setValueStateText("Select Valid Date...");
				sap.m.MessageBox.error("Begin Date is (" + this.getDateString(oCurrentAssignment.BegDate) + ")" + " " + "is greater than " + " " +
					"(" + this.getDateString(oCurrentAssignment.EndDate) + ") \n" + "Could you please select correct Dates.");
			} else if (this.getDateString(oCurrentAssignment.Assignmentenddate) < this.getDateString(oCurrentAssignment.EndDate)) {
				sap.ui.getCore().byId("delendDate").setValueState("Error");
				sap.ui.getCore().byId("delendDate").setValueStateText("Select Valid Date...");
				sap.m.MessageBox.error("Selected date is greater than the Assignment EndDate(" + this.getDateString(oCurrentAssignment.Assignmentenddate) +
					") \n Could you please select correct dates");
				this.getView().getModel("WorklistDemandsToStaff").updateBindings(true);
				this.getView().getModel("WorklistDemandsToStaff").refresh(true);
			} else {
				sap.ui.getCore().byId("delbegDate").setValueState("None");
				sap.ui.getCore().byId("delbegDate").setValueStateText("");
				sap.ui.getCore().byId("delendDate").setValueState("None");
				sap.ui.getCore().byId("delendDate").setValueStateText("");
			}*/
			
			// allow to delete a staffing/changes for current and past week
				var oJan = new Date(new Date().getFullYear(),0,1);
				var today = new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
				var daysOfyear = Math.floor((today - oJan ) / (24*60*60*1000));
				var currentWeek = Math.ceil(daysOfyear / 7);

				var selectedDate = new Date(oCurrentAssignment.BegDate.getFullYear(),oCurrentAssignment.BegDate.getMonth(),oCurrentAssignment.BegDate.getDate());
				var daysOfYearselectedDate = Math.floor((selectedDate - oJan ) / (24*60*60*1000));
				var selectedtWeek = Math.ceil(daysOfYearselectedDate / 7);
			if (currentWeek-1<=selectedtWeek) {
				//	this.getView().setBusy(false);
				sap.ui.getCore().byId("delbegDate").setValueState("None");
				sap.ui.getCore().byId("delbegDate").setValueStateText("");
				
				 if (this.getDateString(oCurrentAssignment.BegDate) > this.getDateString(oCurrentAssignment.EndDate)) {
				sap.m.MessageBox.error("Begin Date is (" + this.getDateString(oCurrentAssignment.BegDate) + ")" + " " + "is greater than " + " " +
					"(" + this.getDateString(oCurrentAssignment.EndDate) + ") \n" + "Could you please select correct Dates.");
					sap.ui.getCore().byId("delendDate").setValueState("Error");
					sap.ui.getCore().byId("delendDate").setValueStateText("Select Valid Date...");
					return;
			}else{
				sap.ui.getCore().byId("delendDate").setValueState("None");
				sap.ui.getCore().byId("delendDate").setValueStateText("");
			}
			} else {
				sap.ui.getCore().byId("delbegDate").setValueState("Error");
				sap.ui.getCore().byId("delbegDate").setValueStateText("Select Valid Date...");
				sap.m.MessageBox.warning("You can't Select/modify before past week dates..\n allow staffing/changes for current and past week only");
				this.getView().getModel("WorklistDemandsToStaff").updateBindings(true);
				this.getView().getModel("WorklistDemandsToStaff").refresh(true);
				return;
			}
			//	}
		},
		onCloseDialog: function (oEvent) {
			this.deleteDialogRange.close();
			this.getView().setModel(this.getOwnerComponent().getModel("resReq"));
			this.getView().setModel(this.getOwnerComponent().getModel("default"));
		},
		onEmployeeChange: function(oEvent){
			var oEmpInput = oEvent.getSource();
        	var  oEmpId = oEmpInput.getValue();

        //to account for when focus leaves the control and we dont want to fire seach with empty input 
        if(oEmpId === ""){ 
            return;
        }
        	var aFilters = [];
			aFilters.push(new sap.ui.model.Filter("BegDate", sap.ui.model.FilterOperator.EQ, new Date()));
			aFilters.push(new sap.ui.model.Filter("EndDate", sap.ui.model.FilterOperator.EQ, new Date()));
			aFilters.push(new sap.ui.model.Filter("EmpId", sap.ui.model.FilterOperator.EQ, oEmpId));

			this.getView().getModel("resReq").read("/ResourceList", {
				filters: aFilters,
				success: function (oResponse) {
					if (oResponse.results.length <= 0) {
						this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0].getFragment().setValue("");
						sap.m.MessageToast.show("No EmployeeID maintained in employee search Box. Please add EmpID");
						// this.displayNotValidEmployeeDialog(sEmpID);
					} else {
						var oresponceData = oResponse.results[0];
						var oAssignedData = this.getView().getModel("AssigndDemand").getData().results[0];
						oAssignedData.ResGuid = oresponceData.ResGuid;
						oAssignedData.FullName = oresponceData.FullName;
						oAssignedData.Employee = oresponceData.EmpId;
						oAssignedData.employeeId = oResponse.results[0].EmpId;
						oAssignedData.firstName = oResponse.results[0].FirstName;
						oAssignedData.lastName = oResponse.results[0].LastName;
						this.getView().getModel("AssigndDemand").updateBindings(true);
						this.getView().getModel("AssigndDemand").refresh(true);
					}
					//this.oTable.getAggregation('items')[0].getCells()[6].getItems()[0].getFragment().setProperty(oResponse.results[0].EmpId);
				}.bind(this)
			});

		},
		onEmployeeSearchOpen: function(oEvent){
			var oButn = oEvent.getSource().sId;
			this._rowCombo = oButn.split("-")[4];
			if (!this._ProdId) {
				this._ProdId = sap.ui.xmlfragment("sap.support.boost.fragment.f4helpp", this);
				this.getView().addDependent(this._ProdId);
			}
			this._ProdId.addStyleClass("sapUiSizeCompact");
			var myModel = new sap.ui.model.json.JSONModel({
				empData: []
			});
			this.getView().setModel(myModel, "userEmpModel");

			this._ProdId.open();
			sap.ui.getCore().byId("idFrstName").setValue("");
			sap.ui.getCore().byId("idLstName").setValue("");
			sap.ui.getCore().byId("idEmpNum").setValue("");
		},
		onSearchName: function(oEvent){
				var urlFilter;
			sap.ui.getCore().byId("idF4Table").getModel("userEmpModel").setData({
				empData: []
			});
			var fName = sap.ui.getCore().byId("idFrstName").getValue();
			var lName = sap.ui.getCore().byId("idLstName").getValue();
			var cId = sap.ui.getCore().byId("idEmpNum").getValue();
			var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-ddTHH:MM:ss"
			});
			var date = oDateFormat.format(new Date());
			if (fName !== "" && lName === "" && cId === "") {
				urlFilter = ["$filter=(substringof('" + fName + "',FirstName)and BegDate eq datetime'" + date + "' and EndDate eq datetime'" +
					date + "')"
				];
			} else if (lName !== "" && fName === "" && cId === "") {
				urlFilter = ["$filter=(substringof('" + lName + "',LastName)and BegDate eq datetime'" + date + "' and EndDate eq datetime'" +
					date + "')"
				];
			} else if (cId !== "" && fName === "" && lName === "") {
				urlFilter = ["$filter=( EmpId eq '" + cId + "' and BegDate eq datetime'" + date + "' and EndDate eq datetime'" + date + "')"];
			} else if (fName !== "" && lName !== "" && cId === "") {
				urlFilter = ["$filter=(substringof('" + fName + "',FirstName) and substringof('" + lName +
					"',LastName) and BegDate eq datetime'" + date + "' and EndDate eq datetime'" + date + "')"
				];
			} else if (fName !== "" && cId !== "" && lName === "") {
				urlFilter = ["$filter=(substringof('" + fName + "',FirstName) and EmpId eq '" + cId +
					"' and BegDate eq datetime'" + date + "' and EndDate eq datetime'" + date + "')"
				];
			} else if (lName !== "" && cId !== "" && fName === "") {
				urlFilter = ["$filter=(substringof('" + lName + "',LastName) and EmpId eq '" + cId +
					"' and BegDate eq datetime'" + date + "' and EndDate eq datetime'" + date + "')"
				];
			} else if (fName !== "" && lName !== "" && cId !== "") {
				urlFilter = ["$filter=(substringof('" + fName + "',FirstName) and substringof('" + lName + "',LastName) and EmpId eq '" + cId +
					"' and BegDate eq datetime'" + date + "' and EndDate eq datetime'" + date + "')"
				];
			}
			this._ProdId.setBusy(true);
			this.getView().getModel("resReq").read("/ResourceList", {
				async: true,
				method: "GET",
				urlParameters: urlFilter,
				success: function (oData, response) {
					this._ProdId.setBusy(false);
					var mData = oData.results;
					if (mData.length > 0) {
						for (var i = 0; i <= mData.length - 1; i++) {
							this.getView().getModel("userEmpModel").getProperty("/empData").push(mData[i]);
						}
						this.getView().getModel("userEmpModel").refresh(true);
					} else {
						sap.m.MessageToast.show("NO DATA");
					}
				}.bind(this),
				error: function (err) {
					this._ProdId.setBusy(false);
					sap.m.MessageToast.show("Error in getting values");
				}
			});
		},
		onSelectionF4Name: function (oEvent){
			var selItem = oEvent.getParameter("listItem").getBindingContext("userEmpModel").getObject();
			this._selEmpId = selItem.EmpId;
			this._selEmpName = selItem.FullName;
			this._ResGuid = selItem.ResGuid;
			var oAssignedData = this.getView().getModel("AssigndDemand").getData();
			if(oAssignedData){
				oAssignedData.results[0].FullName = selItem.FullName;
				oAssignedData.results[0].Employee = selItem.EmpId;
				oAssignedData.results[0].ResGuid = selItem.ResGuid;
				oAssignedData.results[0].employeeId = selItem.EmpId;
				oAssignedData.results[0].firstName = selItem.FirstName;
				oAssignedData.results[0].lastName = selItem.LastName;
				this.oTable.getAggregation("items")[0].getCells()[6].getItems()[0].setValue(selItem.EmpId);
				this.getView().getModel("AssigndDemand").updateBindings(true);
				this.getView().getModel("AssigndDemand").refresh(true);
			}
			
		},
		onf4HelpOk: function (oEvent){
			this._ProdId.close();
		},
		onCancelFragment : function(oEvent){
			this._ProdId.close();
		},
      getSystemLandscapeInfo: function () {
			var sSystem = "ICP"; // Default - Production
			if (window.location.host.toLowerCase().includes("br339jmc4c")) {
				sSystem = "ICD";
			} else if (window.location.host.toLowerCase().includes("sapitcloudt")) {
				sSystem = "ICT";
			}
			return sSystem;
		},
      trackUser: function (component, sUserId) {
			try {
				if(this.getSystemLandscapeInfo() === this.BACKND_SYS_ICP){
					sap.git.usage.Reporting.setUser(component, sUserId);
				}
			} catch (err) {
				console.log("Error while triggering event for User: "+sUserId);
			}
		},
      trackEvent: function (component, sEventName) {
			try {
				if(this.getSystemLandscapeInfo() === this.BACKND_SYS_ICP){
					sap.git.usage.Reporting.addEvent(component, sEventName);
				}
			} catch (err) {
				console.log("Error while triggering event: "+sEventName);
			}
		}
	});

});