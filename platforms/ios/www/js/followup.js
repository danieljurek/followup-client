var FollowUp = { 

	domain: "http://followup.danieljurek.com", 

	init: function() { 
		//
		//	Start up logic
		//
		var userId = localStorage.getItem("userId"); 
		if(userId) { 
			window.location.hash = "main"; 
			setTimeout(FollowUp.checkServerActions, 2000); 
		} else { 
			window.location.hash = "login"; 
		}


		//
		//	Events
		//
		$("#loginButton").click(FollowUp.authenticate); 
		//$("#newFollowUpButton").click(FollowUp.)
		$("#editCampaignButton").click(FollowUp.showEditCampaign); 

		//
		//	Check server for contact status
		//
		

	}, 


	// 
	//	Local Storage Helpers
	//
	fromLocal: function(key) { 
		var value = localStorage.getItem(key); 
		if(value) { 
			return jQuery.parseJSON(value); 
		} else { 
			return null; 
		}
	},

	toLocal: function(key, value) { 
		localStorage.setItem(key, JSON.stringify(value)); 
	},

	//
	//	Check for pending actions from the server
	//
	checkServerActions: function() { 
		$.ajax(FollowUp.domain + "/card/get_completed", { 
			type: "GET", 
			dataType: "json", 
			data: { user_id: FollowUp.fromLocal("userId") }, 
			success: function(data) { 
				var cards = FollowUp.fromLocal("cards"); 
				var updateTables = false; 

				$.each(data, function(index, value) { 
					if(cards[index]) { 
						cards[index].email 			= value.contact.emails[0].value; 
						cards[index].firstName 		= value.contact.name.givenName; 
						cards[index].lastName 		= value.contact.name.familyName; 
						cards[index].organization 	= value.contact.organizations[0].name; 

						cards[index].read 			= (value.views > 0 ? true : false); 

						updateTables = true; 
					}
				}); 

				FollowUp.toLocal("cards", cards); 			
				
				if(updateTables)
					FollowUp.loadViewContacts(); 

			}, 
			error: function() { 
				alert("There was an error getting status data from the server"); 
			}, 
			complete: function() { 
				setTimeout(FollowUp.checkServerActions, 2000); 
			}
		});
	}, 

	//
	//	UI Helpers
	//

	authenticate: function() { 
		$.ajax(FollowUp.domain + "/user/login", { 
			type: "POST", 
			dataType: "json", 
			data: { email: $("#loginEmailInput").val() }, 
			success: function(data) { 
				localStorage.setItem("userId", data.user_id); 
				window.location.hash = "main"; 
				setTimeout(FollowUp.checkServerActions, 2000); 
			}, 
			error: function() { 
				alert("There was an error logging in!"); 
			}
		});
	}, 

	showEditCampaign: function() { 
		FollowUp.populateCampaigns("#campaignList");
	},

	populateCampaigns: function(targetId) { 
		var campaigns = FollowUp.fromLocal("campaigns"); 

		if(!campaigns) 
			return; 

		$(targetId).html(''); 

		$.each(campaigns, function(index, value) { 
			$(targetId).append("<li><a rel='"+ index + "' onClick='FollowUp.handleSelectedCampaign(this)'>" + value.name + "</a></li>"); 
		});  
		$(targetId).listview("refresh"); 
	}, 

	addCampaignToken: function(element, targetId) { 
		var tokenName = $(element).attr('data-value');

		// TODO: Add our insertion logic here... 
		$(targetId).val($(targetId).val() + tokenName); 
	}, 

	saveCampaign: function() { 
		var campaigns = FollowUp.fromLocal("campaigns"); 

		if(!(campaigns instanceof Array))
			campaigns = new Array(); 


		campaigns.push({ 
			name: $("#campaignName").val(),
			subject: $("#campaignSubject").val(),
			body: $("#campaignText").val()
		}); 

		FollowUp.toLocal('campaigns', campaigns); 

		$("#newCampaignForm")[0].reset(); 
		window.location.hash = "editCampaigns"; 
		FollowUp.showEditCampaign(); 
	}, 

	handleSelectedCampaign: function(element) { 
		FollowUp.toLocal("selectedCampaign", $(element).attr('rel')); 

		if(window.location.hash == "#selectCampaign") { 
			window.location.hash = "newFollowUp"; 
		} else {
			alert("Campaign editing not implemented yet."); 
		}
	},

	showSelectCampaign: function() { 
		FollowUp.populateCampaigns("#selectCampaignList"); 
	},

	captureImage: function() { 
		window.location.hash = "loadingPage"; 

		$.ajax(FollowUp.domain + '/card/submit', { 
			type: "POST", 
			data: { user_id: FollowUp.fromLocal("userId"), front: samplePicture }, 
			dataType: "json", 
			success: function(data) { 
				var cards = FollowUp.fromLocal("cards"); 
				if(!cards) { 
					cards = new Object(); 
				}

				cards[data.request_id] = { 
					requestId: data.request_id, 
					email: null, 
					firstName: null, 
					lastName: null, 
					organization: null, 
					campaign: parseInt(FollowUp.fromLocal('selectedCampaign')),
					track: ($("#trackEmailSelector").val() == "true" ? true : false), 
					sent: false, 
					read: false
				}; 

				FollowUp.toLocal("cards", cards); 

			}, 
			error: function() { 
				alert("There was an error! :(");
			}, 
			complete: function() { 
				window.location.hash = "main";  
			}
		});
		/*
		navigator.camera.getPicture(FollowUp.imageCaptured, FollowUp.imageCaptureError, { 
			quality: 75, 
			destionationType: Camera.DestinationType.DATA_URL, 
			saveToPhotoAlbum: true
		}); */
	}, 

	imageCaptured: function(imageData) { 

	}, 

	loadViewContacts: function() { 
		var contacts = FollowUp.fromLocal("cards"); 
		
		var contactsTranslating = new Object; 
		var contactsPendingEmail = new Object; 
		var contactsWaitingRead = new Object; 
		var contactsRead = new Object; 
		var contactNotTracked = new Object; 


		$.each(contacts, function(index, value) { 
			if(!value.email) { 
				contactsTranslating[index] = value; 
			} else if(!value.sent) { 
				contactsPendingEmail[index] = value; 
			} else if(value.sent && value.track && !value.read) { 
				contactsWaitingRead[index] = value; 
			} else if(value.sent && value.track && value.read) { 
				contactsRead[index] = value; 
			} else { 
				contactNotTracked[index] = value; 
			}
		});

		$("#contactsTranslating").html(''); 
		$.each(contactsTranslating, function(index, value) { 
			$("#contactsTranslating").append($("<li><a data-role='button'>" + value.requestId + "</a></li>")); 
		});
		$("#contactsTranslating").listview("refresh"); 


		$("#contactsPendingEmail").html(''); 
		$.each(contactsPendingEmail, function(index, value) { 
			$("#contactsPendingEmail").append($("<li><a data-role='button' rel='" + index + "' onClick='FollowUp.composeEmail(this)'>" 
				+ value.firstName + ' ' + value.lastName + "</a></li>")); 
		});
		$("#contactsPendingEmail").listview("refresh"); 


		$("#contactsWaitingRead").html(''); 
		$.each(contactsWaitingRead, function(index, value) { 
			$("#contactsWaitingRead").append($("<li><a data-role='button'>" + value.firstName + ' ' + value.lastName + "</a></li>")); 
		});
		$("#contactsWaitingRead").listview("refresh"); 

		$("#contactsRead").html(''); 
		$.each(contactsRead, function(index, value) { 
			$("#contactsRead").append($("<li><a data-role='button'>" + value.firstName + ' ' + value.lastName + "</a></li>")); 
		});
		$("#contactsRead").listview("refresh"); 


		$("#contactNotTracked").html(''); 
		$.each(contactNotTracked, function(index, value) { 
			$("#contactNotTracked").append($("<li><a data-role='button'>" + value.firstName + ' ' + value.lastName + "</a></li>")); 
		});
		$("#contactNotTracked").listview("refresh"); 

	}, 

	composeEmail:function(element) {
		debugger; 
		var cardId = $(element).attr('rel'); 
		var cards = FollowUp.fromLocal('cards'); 
		var campaigns = FollowUp.fromLocal('campaigns'); 

		if(cards[cardId]) { 
			var card = cards[cardId]; 
			var campaign = campaigns[card.campaign];

			var subject = FollowUp.replaceAll('{FirstName}', card.firstName, campaign.subject); 
			subject = FollowUp.replaceAll('{LastName}', card.lastName, subject); 
			subject = FollowUp.replaceAll('{Organization}', card.organization, subject); 

			var body = FollowUp.replaceAll('{FirstName}', card.firstName, campaign.body); 
			body = FollowUp.replaceAll('{LastName}', card.lastName, body); 
			body = FollowUp.replaceAll('{Organization}', card.organization, body); 


			if(card.track) { 
				$.ajax(FollowUp.domain + "/email/create/", { 
					type: "POST", 
					dataType: "json", 
					data: { user_id: FollowUp.fromLocal('userId'), request_id: cardId }, 
					success: function(data) { 
						body = FollowUp.replaceAll("\n", "<br />", body); 
						body += "<img src='"+ FollowUp.domain + "/email/view/?" + data.uuid + "' />"; 

						FollowUp.emailComposer(card.email, subject, body, true, cardId);   
					}, 
					error: function() { 
						alert("Error getting the tracking element."); 
					}
				}); 

				
			} else { 
				FollowUp.emailComposer(card.email, subject, body, false, cardId); 	   
	   		}  
	   }     
	}, 

	emailComposer: function(to, subject, body, isHtml, cardId) { 
		cordova.require('emailcomposer.EmailComposer').show({
		    to: to,
		    subject: subject,
		    body: body,
		    isHtml: isHtml,
		    onSuccess: function (winParam) {
		        if(winParam == 2) { 
		        	var cards = FollowUp.fromLocal('cards'); 
		        	cards[cardId].sent = true;
		        	FollowUp.toLocal('cards', cards); 
		        } else { 
		        	alert("email was not sent"); 
		        }

		        FollowUp.loadViewContacts(); 
		    },
		    onError: function (error) {
		        alert("There was a problem composing the email."); 
		    }
		});  
	}, 

	replaceAll: function(find, replace, str) {
  		return str.replace(new RegExp(find, 'g'), replace);
	}


};