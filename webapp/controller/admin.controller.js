sap.ui.define([
	"sap/support/boost/controller/BaseController",
	"sap/support/boost/model/formatter",
	"sap/ui/layout/cssgrid/CSSGrid",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/support/boost/fragment/AssignWorklistDemand.fragment.controller",
	"sap/support/boost/util/i18n",
	"sap/support/boost/util/helpers",
	"sap/support/boost/util/ErrorCodeHelper",
	"sap/support/boost/model/formatterReuse",
	"sap/support/boost/fragment/AssignmentsWarningHelper.fragment.controller"
], function (BaseController, formatter, CSSGrid, JSONModel, Fragment,
	AssignWorklistDemandController, i18n, helpers, ErrorCodeHelper, formatterReuse, AssignmentsWarningHelper) {
	"use strict";

	return BaseController.extend("sap.support.boost.controller.admin", {
		formatter: formatter,
		formatterReuse: formatterReuse,

		onInit: function () {

			var curr = new Date();
			var first = curr.getDate() - curr.getDay();
			first = first + 1;
			var last = first + 6;
			last = last - 2;

			this._firstday = new Date(curr.setDate(first)).toUTCString();
			this._lastday = new Date(curr.setDate(last)).toUTCString();

			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("app", "getAdminStaffingDate", this.onLoadSuggestionList, this);
			oEventBus.subscribe("admin", "getAdminStaffing", this.onLoadSuggestionList, this);

			this.getRouter().getRoute("admin").attachPatternMatched(this._onRouteMatched, this);

		},
		_onRouteMatched: function () {
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
			this.getModel('Config').setProperty('/team', true);
			this.getModel("selectedKey").setProperty("/page", "admin");
			this.fromRoute = true;
			this.onLoadSuggestionList();
			}
		},
		onLoadSuggestionList: function () {
			//	this.showBusyIndicator();
			var sRegion = this.getModel("selectedKey").getProperty("/region");
			if (!sRegion) {
				sRegion = "EMEA BACKOFFICE NEW";
			}
			var myModel = new sap.ui.model.json.JSONModel({
				"comboItems": []
			});
			this.getView().setModel(myModel, "ComboModel");
			this.getView().setBusy(true);

			var urlParams = "$filter=Region eq '" + sRegion + "'";
			this.getModel("default").read("/SuggestResourceListSet", {
				async: false,
				method: "GET",
				urlParameters: urlParams,
				success: function (oData) {
					this.getView().setBusy(false);
				//	this.hideBusyIndicator();
					if (oData.results.length !== 0) {
						var mData = oData.results;
						for (var i = 0; i <= mData.length - 1; i++) {
							var oArry = {
								dataSuggest: mData[i],
								EmpId: mData[i].EmpId,
								FullName: mData[i].FullName,
								ItemNumber: mData[i].ItemNumber,
								ResGuid: mData[i].ResGuid
							};
							this.getView().getModel("ComboModel").getProperty("/comboItems").push(oArry);

						}
					}
					this.getView().getModel("ComboModel").refresh(true);
					this.handleAdminStaffing();
				}.bind(this),
				error: function () {
				//	this.hideBusyIndicator();
					this.getView().setBusy(false);
					sap.m.MessageToast.show("Error in Loading Suggestion List.");
					this.handleAdminStaffing();
				}.bind(this)
			});
		},

		handleAdminStaffing: function () {
			var startday;
			this.onLoadTaskTypes();
			var sRegion = this.getModel("selectedKey").getProperty("/region");
			if (!sRegion) {
				sRegion = "EMEA BACKOFFICE NEW";
			}

			var sTeam = this.getModel("selectedKey").getProperty("/team");
			if (!sTeam && this.fromRoute) {
				sTeam = "Control Center";
			}
			this.getView().byId("headerTitle").setText(sTeam);

			var date = this.getModel("datePick").getProperty("/date");
			if (!date) {
				startday = formatter.dateFormatChange(new Date(this._firstday));
				// var enddate = formatter.dateFormatChange(new Date(this._firstday));
			} else {
				startday = formatter.dateFormatChange(new Date(date));
			}

			var aURLParam = ["$filter= Date ge " + startday + " and Date le " + startday + " and Region eq '" + sRegion + "'and WorkLoad eq ''"];
			var myModel1 = new sap.ui.model.json.JSONModel({
				"StaffItems": []
			});
			this.getView().setModel(myModel1, "StaffModel");

			this.getModel("default").read("/Staffing", {
				method: "GET",
				urlParameters: aURLParam,
				success: function (oData, response) {
					var oStaffingData = oData.results;
					if (oStaffingData !== 0) {
						var myJsonModel = new sap.ui.model.json.JSONModel(oStaffingData);
						this.getView().setModel(myJsonModel, "tStafData");
						this.getView().getModel("tStafData").refresh(true);
						var tStadDta = this.getView().getModel("tStafData").getData();
						var teamData = tStadDta.filter(function (emp) {
							return (emp.Team_Id === sTeam);
						});

						for (var i = 0; i <= teamData.length - 1; i++) {
							if (teamData[i].Asgnguid === "" && teamData[i].Flag === "") {
								var suggArry = [];

								var suggestList = this.getView().getModel("ComboModel").getProperty("/comboItems");
								var startDay = this.formatter.removeTimeOffset(teamData[i].Startdate);
								var endDay = this.formatter.removeTimeOffset(teamData[i].Enddate);
								var itemID = teamData[i].Service_Item_Id;
								for (var p = 0; p <= suggestList.length - 1; p++) {
									if (itemID === suggestList[p].ItemNumber) {
										suggArry.push(suggestList[p]);
									}
								}
								suggArry = Array.from(new Set(suggArry.map(a => a.EmpId))).map(EmpId => {
									return suggArry.find(a => a.EmpId === EmpId)
								});
								var sArry = {
									role: teamData[i].Role,
									text: "Slot Empty",
									dataModel: teamData[i],
									team: teamData[i].Team_Id,
									startDay: startDay,
									endDay: endDay,
									task: teamData[i].TaskType,
									fraction: Number(teamData[i].StaffFraction).toFixed(1),
									suggestEmp: suggArry,
									InternalOrder: teamData[i].InternalOrder,
									IoEditable: teamData[i].InternalOrder ? true : false
								};
								this.getView().getModel("StaffModel").getProperty("/StaffItems").push(sArry);
							}
							this.getView().getModel('resReq').read("/ResDemandSet('" + teamData[i].ItemGuid + "')");

						}
					} else {
						sap.m.MessageToast("No Data");
					}
					this.getView().getModel("StaffModel").refresh(true);
					this.hideBusyIndicator();

				}.bind(this),
				error: function (err) {
					sap.m.MessageToast.show("Error in getting values");
					this.hideBusyIndicator();

				}
			});
		},
		onLoadTaskTypes: function () {
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
			this.setModel(ojsonTasktype, "taskTypeModel");
			this.getModel("taskTypeModel").refresh(true);
			// loading fraction data
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
						},{
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
			this.setModel(ojsonFraction, "FractionModel");
			this.getModel("FractionModel").refresh(true);
		},
		onSaveButton: function (oEvent) {
			var validateItems = 0;
			var notSelectedItems = 0;
			var oItems = this.getView().byId("idStaffdata").getItems();
			for (var i = 0; i <= oItems.length - 1; i++) {
				if (oItems[i].getAggregation("content")[1].getAggregation("items")[1].getProperty("value")) {
					if (oItems[i].getAggregation("content")[1].getAggregation("items")[1].getProperty("valueState") !== "None") {
						validateItems = parseInt(validateItems, 0) + 1;
					}
					if (oItems[i].getAggregation("content")[1].getAggregation("items")[2].getProperty("valueState") !== "None") {
						validateItems = parseInt(validateItems, 0) + 1;
					}
					if (oItems[i].getAggregation("content")[1].getAggregation("items")[3].getProperty("valueState") !== "None") {
						validateItems = parseInt(validateItems, 0) + 1;
					}
				} else {
					notSelectedItems = parseInt(notSelectedItems, 0) + 1;
				}
			}
			if (validateItems !== 0) {
				sap.m.MessageBox.warning("Please enter all details before submit");
			} else if (oItems.length === notSelectedItems) {
				sap.m.MessageBox.warning("Please enter details before submit");
			} else {
				if (notSelectedItems > 0) {
					sap.m.MessageBox.information("You haven't entered all the details. Do you still want to proceed further?", {
						actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
						onClose: function (sAction) {
							if (sAction === sap.m.MessageBox.Action.OK) {
								this.createStaffing(oEvent);
							}
						}.bind(this)
					});
				} else {
					this.createStaffing(oEvent);
					// this.onLoadSuggestionList();
				}
			}
		},
		createStaffing: function (oEvent) {
			var sRegion = this.getModel("selectedKey").getProperty("/region");
			if (!sRegion) {
				sRegion = "EMEA BACKOFFICE NEW";
			}

			var sTeam = this.getModel("selectedKey").getProperty("/team");
			if (!sTeam && this.fromRoute) {
				sTeam = "Control Center";
			}

			var dataStaff = this.getView().getModel("StaffModel").getProperty("/StaffItems");
			var oItems = this.getView().byId("idStaffdata").getItems();
			var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-ddTHH:MM:ss"
			});
			this.getView().setBusy(true);
		//	this.showBusyIndicator();
			this.resolveArray = [];
			this.rejectArray = [];
			for (var i = 0; i <= oItems.length - 1; i++) {
				var role = oItems[i].getAggregation("content")[0].getAggregation("items")[0].getProperty("text");
				var selUser = oItems[i].getAggregation("content")[1].getAggregation("items")[1].getProperty("value");
				if (selUser) {
					var resGuid = oItems[i].getAggregation("content")[1].getAggregation("items")[1].getProperty("selectedKey");
					var taskType = oItems[i].getAggregation("content")[1].getAggregation("items")[2].getProperty("value");
					var staffFraction = oItems[i].getAggregation("content")[1].getAggregation("items")[3].getProperty("value");
					var startDate = oDateFormat.format(new Date(oItems[i].getAggregation("content")[1].getAggregation("items")[4].getProperty("value")));
					var endDate = oDateFormat.format(new Date(oItems[i].getAggregation("content")[1].getAggregation("items")[5].getProperty("value")));
					var details = dataStaff.filter(function (items) {
						return (items.role === role);
					});
					var itemGuid = details[0].dataModel.ItemGuid;
					var StaffingManager = details[0].dataModel.StaffingManager;
					var sUrl = ["TaskType='" + taskType + "'&Region='" + sRegion +
						"'&Monday='true'&Tuesday='true'&Wednesday='true'&Thursday='true'&Friday='true'&Saturday='false'&Sunday='false'&ResGuid='" +
						resGuid + "'&ItemGuid='" + itemGuid + "'&EndTstmp=datetime'" + endDate + "'&BegTstmp=datetime'" + startDate +
						"'&StaffFraction='" + staffFraction + "'&StaffingManager='" + StaffingManager + "'"
					];
					new Promise(function (req, res) {}).then(this.oStaffingCall(sUrl,role,itemGuid))

				}
			}
			if (this.rejectArray.length === 0 && this.resolveArray.length === 0) {

			} else {

				// var oMessageTemplate = new sap.m.MessageItem({
				// 	type: '{type}',
				// 	title: '{title}',
				// 	activeTitle: "{active}",
				// 	description: '{description}',
				// 	subtitle: '{subtitle}',
				// 	counter: '{counter}'
				// });
				// var oMessagePopover = new sap.m.MessagePopover({
				// 	items: {
				// 		path: '/',
				// 		template: oMessageTemplate
				// 	},
				// 	activeTitlePress: function () {
				// 		//	MessageToast.show('Active title is pressed');
				// 		//	this.onLoadSuggestionList();

				// 	}.bind(this)
				// });
			//	var data = jQuery.merge(this.rejectArray, this.resolveArray);
				var data = this.rejectArray;
				var myJson = new sap.ui.model.json.JSONModel(data);
				this.setModel(myJson,"popData");
				
				if (!this.oDefaultDialog) {
					this.oDefaultDialog = new sap.m.Dialog({
						title: "Assignments/Staffing Response Data",
						content: new sap.m.List({
							headerToolbar:{
								content : new sap.m.OverflowToolbar({
									content : new sap.m.Title({
										text:this.resolveArray.length + " items are Successfully Assigned/Staffed",
										level : "H3"
									})
								})
							},
							items: {
								path: "popData>/",
								template: new sap.m.StandardListItem({
								title: "{popData>title}",
									description: "{popData>description}",
									info: "{popData>subtitle}",
									icon:"{popData>icon}",
									wrapping : "{popData>active}",
									tooltip : "{popData>description}",
									infoState : "{popData>type}",
									highlight: "{popData>type}",
									wrapCharLimit: 100
								})
							}
						}),
						beginButton: new sap.m.Button({
							text: "OK",
							press: function () {
								this.oDefaultDialog.close();
							}.bind(this)
						}),
						endButton: new sap.m.Button({
							text: "Close",
							press: function () {
								this.oDefaultDialog.close();
							}.bind(this)
						})
					});

					this.getView().addDependent(this.oDefaultDialog);
				}
				this.oDefaultDialog.getContent()[0].mAggregations.headerToolbar.getContent()[0].getContent()[0].setText(this.resolveArray.length + " " + "Items are successfully Assigned/Staffed");
				this.oDefaultDialog.open();
			}
			this.onLoadSuggestionList();
			this.getEventBus().publish("admin", "getAdminStaffing");
		},

		oStaffingCall: function (sUrl,role,itemGuid) {
			return new Promise(function (resolve, reject) {
				var that = this;
			//	this.showBusyIndicator();
				this.getView().setBusy(true);
				this.getView().getModel("default1").read("/Assignment_FI", {
					urlParameters: sUrl,
					async: false,
					success: function (oResponse) {
						this.getView().setBusy(false);
					//	this.hideBusyIndicator();
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
						this.resolveArray.push({
							type: "Success",
							title: "Success message",
							active: true,
							description: "Assignments Created Successfully" + " " + msgResponce + "and" + msgResponceRfc,
							subtitle: role,
							icon: "sap-icon://accept"
						});

						resolve(this.resolveArray);
					}.bind(this),
					error: function (oResponse) {
						this.getView().setBusy(false);
					//	this.hideBusyIndicator();
						if(oResponse.responseText === undefined){
							var sErrorMsg = oResponse;
						}else{
						var sErrorMsg = JSON.parse(error.responseText);
			                var sItemGuid = sErrorMsg.error.message.value;
						}
			            var oDemand = this.getView().getModel('resReq').getProperty("/ResDemandSet('" + itemGuid + "')");
			            var oOrg = this.getView().getModel('resReq').getProperty("/ResServiceTeamSet('" + oDemand.Organization + "')");
				       if(sErrorMsg.response.body === undefined){
				       	        var  aErrorCodes = "";
                                var sErrorMsgDisplay = "";
				       }else{
				      var  aErrorCodes = JSON.parse(oResponse.response.body).error.innererror.errordetails;
				       var sErrorMsgDisplay = "";
				       }

			        sErrorMsgDisplay += ErrorCodeHelper.getMessageForErrorCodes(aErrorCodes, oDemand, oOrg);
						this.rejectArray.push({
							type: "Error",
							title: "Error message",
							active: true,
							description: sErrorMsgDisplay,
							subtitle: role,
							icon: "sap-icon://decline"
						});
						/*this.rejectArray.push({
							type: 'Error',
							title: 'Error message',
							active: true,
							description: JSON.parse(error.responseText).error.message.value,
							subtitle: role,
							icon: "sap-icon://decline"
						});*/
						reject();
					}.bind(this)
				});
			}.bind(this));
		},

		handleTasktypeDropdown: function (oEvent) {
			var rowEmp = oEvent.getSource().sId;
			var rowValue = rowEmp.split("-")[6];

			/*if (!this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).getValue()) {
				//this.getView().byId("__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
				this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
				this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");

				return;
			}
			if (!this.getView().byId("__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + rowValue).getValue()) {
				//this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
				this.getView().byId("__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
				return;
			}*/

			this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValueState("None");
			this.getView().byId("__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + rowValue).setValueState("None");
		},
		handleUserDropdown: function (oEvent) {
			var rowEmp = oEvent.getSource().sId;
			var rowValue = rowEmp.split("-")[6];
			var selName = oEvent.getSource()._getSelectedItemText();
			var selItemEmpId = oEvent.getSource()._getSelectedItemText().split("-")[0].trim()
			var tStadDta = this.getView().getModel("tStafData").getData();
			tStadDta = tStadDta.filter(function (cuser) {
				return (cuser.Asgnguid)
			});
			if (tStadDta.length >= 0) {
				var employee = tStadDta.filter(function (emp) {
					return (emp.Employee_Id === selItemEmpId)
				});
			}
			if (employee.length <= 0) {
				/*if (!this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).getValue()) {
					this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
					//this.getView().byId("__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
					return;
				}
				if (!this.getView().byId("__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + rowValue).getValue()) {
					//    this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
					this.getView().byId("__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
					return;
				}*/

				this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValueState("None");
				this.getView().byId("__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + rowValue).setValueState("None");

			} else {
				sap.m.MessageBox.warning("Selected Person (" + selName + ") has already staffed in current week.\n Please select another person");
				this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValue("");
				this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
			}

			//
		},
		
		handleFractionDropdown : function(oEvent){
			var rowEmp = oEvent.getSource().sId;
			var rowValue = rowEmp.split("-")[6];
			if(!this.getView().byId("__xmlview0--idfractionadmin-__xmlview0--idStaffdata-" + rowValue).getValue()){
				this.getView().byId("__xmlview0--idfractionadmin-__xmlview0--idStaffdata-" + rowValue).setValueState("Error");
				this.getView().byId("__xmlview0--idfractionadmin-__xmlview0--idStaffdata-" + rowValue).setValueStateText("Please select Fraction");
			}else{
			this.getView().byId("__xmlview0--idfractionadmin-__xmlview0--idStaffdata-" + rowValue).setValueState("None");
			this.getView().byId("__xmlview0--idfractionadmin-__xmlview0--idStaffdata-" + rowValue).setValueStateText("");
			}
		},
		onHelpButtonClick: function (oEvent) {
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
		onSearchName: function () {

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
		onSelectionF4Name: function (oEvent) {
			var selItem = oEvent.getParameter("listItem").getBindingContext("userEmpModel").getObject();
			this._selKeyEmp = selItem.ResGuid;
			var tStadDta = this.getView().getModel("tStafData").getData();
			
			var oStaffedItems = this.getView().getModel('StaffModel').getData().StaffItems;
			for(var i=0; i<oStaffedItems.length; i++){
			if(this.getView().byId("__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + [i]).getSelectedKey() === selItem.ResGuid){
				sap.m.MessageBox.warning("This Person (" + selItem.EmpId + "-" + selItem.FullName +
					") has already selected for this Role "+" " + oStaffedItems[i].role +".\n Please select another person");
				sap.ui.getCore().byId("idF4Table").removeSelections(false);
			return;
			}
				
		}
			tStadDta = tStadDta.filter(function (cuser) {
				return (cuser.Asgnguid)
			});
			if (tStadDta.length >= 0) {
				var employee = tStadDta.filter(function (emp) {
					return (emp.Employee_Id === selItem.EmpId)
				});
			}
			if (employee.length === 0) {
				var selItem = oEvent.getParameter("listItem").getBindingContext("userEmpModel").getObject();
				this._selKeyEmp = selItem.ResGuid;
				var selCom = "__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + this._rowCombo;
				this.getView().byId(selCom).setSelectedKey(selItem.ResGuid);
				this.getView().byId(selCom).setValue(selItem.EmpId + "-" + selItem.FullName);
				var tskType = "__xmlview0--idtasktypeEdit-__xmlview0--idStaffdata-" + this._rowCombo;
				if (!this.getView().byId(tskType).getValue()) {
					this.getView().byId(tskType).setValueState("Error");
				} else {
					this.getView().byId(tskType).setValueState("None");
				}
			} else {
				sap.m.MessageBox.warning("Selected Person (" + selItem.EmpId + "-" + selItem.FullName +
					") has already staffed in current week.\n Please select another person");
				sap.ui.getCore().byId("idF4Table").removeSelections(false);
			}

		},

		onf4HelpOk: function () {
			var table = sap.ui.getCore().byId("idF4Table").getItems();
			if (table !== 0) {
				if (this._selKeyEmp) {
					this._ProdId.close();
				} else {
					sap.m.MessageBox.warning("Please select any Employee Id");
				}
			} else {
				this._ProdId.close();

			}

		},
		onCancelFragment: function () {
			var selCom = "__xmlview0--idSelectUser-__xmlview0--idStaffdata-" + this._rowCombo;
			this.getView().byId(selCom).setSelectedKey("");
			this.getView().byId(selCom).setValue("");
			this._ProdId.close();
		},

		onPressMail: function (oEvent) {
			sap.m.URLHelper.triggerEmail();
			//	sap.m.MessageToast.show("Clicked item Mail button");
		},
		onPressHeadMail: function (oEvent) {
			sap.m.URLHelper.triggerEmail();
			//	sap.m.MessageToast.show("Clicked Header Mail Button");
		},
		showBusyIndicator: function () {
			this._bDailog = new sap.m.BusyDialog();
			this._bDailog.open();
			// this._bDailog.setBusyIndicatorDelay(40000);
		},
		hideBusyIndicator: function () {
			this._bDailog.close();
		},
		onSelectionStaffing: function (oEvent) {

			var selHBox = oEvent.getSource().getAggregation("content")[1];
			var hBoxId = selHBox.sId;
			sap.ui.getCore().byId(hBoxId).setVisible(true);
			selHBox.getAggregation("items")[3].setDateValue(new Date(this._firstday));
			selHBox.getAggregation("items")[4].setDateValue(new Date(this._lastday));
			// oEvent.getSource().getAggregation("content")[1].getAggregation("items")[3].setProperty("value",firstday)
		},
		/*onEditRow: function (oEvent) {
			if (oEvent.getSource().getParent().getItems()[1].getSelectedKey()) {
				this.onSaveRow(oEvent);
				sap.m.MessageToast.show("Assignment is Done");
			} else {
				this._seltedRowId = oEvent.getSource().getParent().getItems()[1];
				oEvent.getSource().getParent().getItems()[0].setEnabled(true);
				oEvent.getSource().getParent().getItems()[1].setEditable(true);
				oEvent.getSource().getParent().getItems()[2].setEditable(true);
				oEvent.getSource().getParent().getItems()[3].setEditable(false);
				oEvent.getSource().getParent().getItems()[4].setEditable(false);
				oEvent.getSource().getParent().getItems()[5].setVisible(true);
				oEvent.getSource().getParent().getItems()[6].setVisible(false);
				oEvent.getSource().getParent().getItems()[3].setDateValue(new Date(this._firstday));
				oEvent.getSource().getParent().getItems()[4].setDateValue(new Date(this._lastday));
			}

		},*/
		/*onSaveRow: function (oEvent) {
			if (oEvent.getSource().getParent().getItems()[0].getSelectedKey() === "") {
				sap.m.MessageToast.show("Please select User ID");
				return;
			}
			if (oEvent.getSource().getParent().getItems()[1].getSelectedKey() === "") {
				sap.m.MessageToast.show("Please select TaskType");
				return;
			}
			oEvent.getSource().getParent().getItems()[0].setEditable(false);
			oEvent.getSource().getParent().getItems()[1].setEditable(false);
			oEvent.getSource().getParent().getItems()[2].setEditable(false);
			oEvent.getSource().getParent().getItems()[3].setEditable(false);
			oEvent.getSource().getParent().getItems()[4].setVisible(false);
			oEvent.getSource().getParent().getItems()[5].setVisible(true);
			oEvent.getSource().getParent().getItems()[5].setEnabled(false);
			oEvent.getSource().getParent().getItems()[5].setTooltip("Assignment Done!!!\n You can not edit this");

			var oSelectedItems = oEvent.getSource().getParent().getItems();
			if (!this.selectedDateArray) {
				this.selectedDateArray = [];
				this.selectedDateArray.push({
					"Emp ID": oSelectedItems[0].getValue(),
					"TaskType": oSelectedItems[1].getValue(),
					"BegDate": oSelectedItems[2].getDateValue(),
					"EndDate": oSelectedItems[3].getDateValue()
				});
			} else {
				this.selectedDateArray.push({
					"Emp ID": oSelectedItems[0].getValue(),
					"TaskType": oSelectedItems[1].getValue(),
					"BegDate": oSelectedItems[2].getDateValue(),
					"EndDate": oSelectedItems[3].getDateValue()
				});
			}
		},*/

	});
});