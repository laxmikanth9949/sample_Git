sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/Fragment",
	"sap/m/GroupHeaderListItem",
	"sap/ui/model/json/JSONModel"
], function(Controller, History, Fragment, GroupHeaderListItem, JSONModel){
	"use strict";
	
	return Controller.extend("sap.support.boost.controller.BaseController", {
		
		BACKND_SYS_ICP: "ICP",
		BACKND_SYS_ICT: "ICT",
		BACKND_SYS_ICD: "ICD",
		STFF_ASSIGNMENTS: "Staffing Assignments",
		DELETE_ASSIGNMENTS: "Deleted Assignments",
		EDIT_ASSIGNMENTS: "Modified Assignments",
		
		getRouter: function(){
		//	return sap.ui.core.UIComponent.getRouterFor(this);
			return this.getOwnerComponent().getRouter();
		},
		
		getEventBus: function () {
			return sap.ui.getCore().getEventBus();
		},

		// navBack: function(){
		// 	if(History.getInstance().getPreviousHash() !== undefined){
		// 		window.history.go(-1);
		// 	}else{
		// 		this.getRouter().navTo("home", {
		// 			ptype: this.getProjectType ? this.getProjectType() : "ui5",
		// 			ctype: "quantity" 
		// 		}, true);
		// 	}
		// },

		getModel: function(sName){
			return this.getOwnerComponent().getModel(sName);
		},
		
		setModel: function(oModel, sName){
			return this.getOwnerComponent().setModel(oModel, sName);
		},
		
		getResourceBundle: function(){
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},
		 getUrlVars:function() {
          var vars = {};
          var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
              vars[key] = value;
          });
          return vars;
      }
	});
});