var FollowUp = { 

	domain: "http://followup.danieljurek.com",			// Leave out the trailing / 
	cameraQuality: 50, 
	checkServerDelay: 5000, 

	init: function() { 
		//
		//	Start up logic
		//
		var userId = localStorage.getItem("userId"); 
		if(userId) { 
			window.location.hash = "main";  
			setTimeout(FollowUp.checkServerActions, FollowUp.checkServerDelay); 
		} else { 
			window.location.hash = "login"; 
		}

		//
		//	Events
		//
		$("#loginButton").click(FollowUp.authenticate); 
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
				if(!cards) 
						cards = {}; 
				var updateTables = false; 

				$.each(data, function(index, value) { 
					if(!cards[index]) { 
						cards[index] = {}; 
						updateTables = true; 
					}

					if(cards[index].email != value.contact.emails[0].value) {
						cards[index].email = value.contact.emails[0].value; 
						updateTables = true; 
					}

					if(cards[index].firstName != value.contact.name.givenName) {
						cards[index].firstName = value.contact.name.givenName; 
						updateTables = true; 
					}

					if(cards[index].lastName != value.contact.name.familyName) {
						cards[index].lastName = value.contact.name.familyName; 
						updateTables = true; 
					}

					if(cards[index].organization != value.contact.organizations[0].name) { 
						cards[index].organization = value.contact.organizations[0].name;
						updateTables = true; 
					} 

					if(cards[index].read != (value.views > 0 ? true : false)) { 
						cards[index].read = (value.views > 0 ? true : false); 
						updateTables = true; 
					}

					if(cards[index].campaign_id != value.campaignId) { 
						cards[index].campaign_id = value.campaignId; 
					}

					if(cards[index].track != value.track) { 
						cards[index].track = value.track; 
					}

					if(cards[index].sent != value.sent) { 
						cards[index].sent = value.sent; 
					}
				}); 

				FollowUp.toLocal("cards", cards); 			
				
				if(updateTables) 
					FollowUp.loadViewContacts(); 

			}, 
			error: function() { 
				// Sink error 
			}, 
			complete: function() { 
				setTimeout(FollowUp.checkServerActions, FollowUp.checkServerDelay); 
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
			data: { email: $("#loginEmailInput").val(), password: $("#loginPasswordInput").val() }, 
			success: function(data) { 
				localStorage.setItem("userId", data.user_id); 
				window.location.hash = "main"; 
				setTimeout(FollowUp.checkServerActions, FollowUp.checkServerDelay); 
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
		$.ajax(FollowUp.domain + "/campaign", { 
			type: 'GET',
			dataType: 'json', 
			data: { user_id: FollowUp.fromLocal('userId') }, 
			success: function(data) { 
				if(!data.campaigns) 
					return; 

				$(targetId).html(''); 

				$.each(data.campaigns, function(index, value) { 
					$(targetId).append("<li><a rel='"+ value.id + "' onClick='FollowUp.handleSelectedCampaign(this)'>" + value.name + "</a></li>"); 
				});  
				$(targetId).listview().listview('refresh'); 
			}, 
			error: function() { 
				alert("There was an error getting campaigns!"); 
			}
		}); 
	}, 

	addCampaignToken: function(element, targetId) { 
		var tokenName = $(element).attr('data-value');

		// TODO: Add our insertion logic here... 
		$(targetId).val($(targetId).val() + tokenName); 
	}, 

	saveCampaign: function() { 
		$.ajax(FollowUp.domain + "/campaign/create?user_id=" + FollowUp.fromLocal('userId'), { 
			type: 'POST', 
			data: { 
				name: $("#campaignName").val(),
				subject: $("#campaignSubject").val(),
				body: $("#campaignText").val()
			}, 
			async: false, 
			error: function() { 
				alert("There was an error saving the campaign."); 
			}
		}); 

		$("#newCampaignForm")[0].reset(); 
		window.location.hash = "editCampaigns"; 
		FollowUp.showEditCampaign(); 
	}, 

	handleSelectedCampaign: function(element) { 
		debugger; 
		FollowUp.toLocal("selectedCampaign", $(element).attr('rel')); 

		if(window.location.hash == "#selectCampaign") { 
			FollowUp.captureImage(); 
		} else {
			alert("Campaign editing not implemented yet."); 
		}
	},

	showSelectCampaign: function() { 
		FollowUp.populateCampaigns("#selectCampaignList"); 
		$("#selectCampaignList").listview().listview("refresh"); 
	},

	captureImage: function() { 
		navigator.camera.getPicture(
			FollowUp.imageCaptured, 
			FollowUp.imageCaptureError, 
			{
				quality: FollowUp.cameraQuality, 
				encodingType: Camera.EncodingType.JPEG,
				destionationType: Camera.DestinationType.FILE_URI, 
				saveToPhotoAlbum: true, 
				correctOrientation: true, 
			}
		); 
	}, 

	imageCaptured: function(imageData) { 
		// File upload example from: http://metabates.com/2012/04/15/capturing-and-uploading-photos-on-ios-with-phonegap/
      	options = new FileUploadOptions();
      	options.fileKey = "front";
      	options.fileName = imageData.substr(imageData.lastIndexOf('/') + 1);
      	options.mimeType = "image/jpeg";
      	var params = { user_id: FollowUp.fromLocal('userId'), campaign_id: FollowUp.fromLocal('selectedCampaign') }; 
      	options.params = params; 

  		uploader = new FileTransfer();
		uploader.upload(
			imageData, 
			FollowUp.domain + '/card/submit?user_id=' + FollowUp.fromLocal('userId'), 
			function() { 
				window.location.hash="main"; 
			}, 
			function() { 
				alert("file upload fail! :("); 
				window.location.hash = 'main'; 
			}, 
			options);

		window.location.hash = 'main'; 
	}, 

	imageCaptureError: function() { 
		// Error silently 
	},

	loadViewContacts: function() { 
		var contacts = FollowUp.fromLocal("cards"); 
		
		var contactsTranslating = {}; 
		var contactsPendingEmail = {}; 
		var contactsWaitingRead = {}; 
		var contactsRead = {}; 
		var contactNotTracked = {}; 


		// Sort each card item into its respective list 
		$.each(contacts, function(index, value) { 
			if(!value.email) { 
				contactsTranslating[index] = value; 
			} else if(value.sent == 0) { 
				contactsPendingEmail[index] = value; 
			} else if(value.sent && value.track && !value.read) { 
				contactsWaitingRead[index] = value; 
			} else if(value.sent && value.track && value.read) { 
				contactsRead[index] = value; 
			} else { 
				contactNotTracked[index] = value; 
			}
		});

		/*$("#contactsTranslating").html(''); 
		$.each(contactsTranslating, function(index, value) { 
			$("#contactsTranslating").append($("<li><a data-role='button'>" + value.requestId + "</a></li>")); 
			$("#contactsTranslating").listview().listview("refresh"); 
		});*/
		


		$("#contactsPendingEmail").html(''); 
		$.each(contactsPendingEmail, function(index, value) { 
			$("#contactsPendingEmail").append($("<li><a data-role='button' rel='" + index + "' onClick='FollowUp.composeEmail(this)'>" 
				+ value.firstName + ' ' + value.lastName + "</a></li>")); 
			$("#contactsPendingEmail").listview().listview("refresh"); 
		});
		


		$("#contactsWaitingRead").html(''); 
		$.each(contactsWaitingRead, function(index, value) { 
			$("#contactsWaitingRead").append($("<li><a data-role='button'>" + value.firstName + ' ' + value.lastName + "</a></li>")); 
			$("#contactsWaitingRead").listview().listview("refresh"); 
		});
		

		$("#contactsRead").html(''); 
		$.each(contactsRead, function(index, value) { 
			$("#contactsRead").append($("<li><a data-role='button'>" + value.firstName + ' ' + value.lastName + "</a></li>")); 
			$("#contactsRead").listview().listview("refresh"); 
		});
		


		$("#contactNotTracked").html(''); 
		$.each(contactNotTracked, function(index, value) { 
			$("#contactNotTracked").append($("<li><a data-role='button'>" + value.firstName + ' ' + value.lastName + "</a></li>")); 
			$("#contactNotTracked").listview().listview("refresh"); 
		});
		

	}, 

	composeEmail: function(element) {
		var cardId = $(element).attr('rel'); 
		var cards = FollowUp.fromLocal('cards'); 
		var campaigns = FollowUp.fromLocal('campaigns'); 

		if(cards[cardId]) { 
			var card = cards[cardId]; 

			var campaign = {}; 
			$.ajax(FollowUp.domain + '/campaign/get/' + card.campaign_id, { 
				type: 'GET', 
				dataType: 'json', 
				data: { user_id: FollowUp.fromLocal('userId') }, 
				success: function(data) { 

					var campaign = data.campaign; 

					var subject = FollowUp.replaceAll('{FirstName}', card.firstName, campaign.subject); 
					subject = FollowUp.replaceAll('{LastName}', card.lastName, subject); 
					subject = FollowUp.replaceAll('{Organization}', card.organization, subject); 

					var body = FollowUp.replaceAll('{FirstName}', card.firstName, campaign.copy); 
					body = FollowUp.replaceAll('{LastName}', card.lastName, body); 
					body = FollowUp.replaceAll('{Organization}', card.organization, body); 


					if(card.track) { 
						$.ajax(FollowUp.domain + "/email/create/", { 
							type: "POST", 
							dataType: "json", 
							data: { user_id: FollowUp.fromLocal('userId'), request_id: cardId }, 
							success: function(data) { 
								body = FollowUp.replaceAll("\n", "<br />", body); 
								body += "<img src='"+ FollowUp.domain + "/email/view/" + data.uuid + "' />"; 

								FollowUp.emailComposer(card.email, subject, body, true, cardId);   
							}, 
							error: function() { 
								alert("Error getting the tracking element."); 
							}
						}); 

						
					} else { 
						FollowUp.emailComposer(card.email, subject, body, false, cardId); 	   
			   		}
				}, 
				error: function() { 
					alert("Could not get campaign data."); 
				}
			});
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

		        	$.ajax(FollowUp.domain + '/card/set_sent/' + cardId, { 
		        		type: 'GET', 
		        		data: { user_id: FollowUp.fromLocal('userId') }
		        	}); 

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