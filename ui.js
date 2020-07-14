$(async function() {
	// cache some selectors we'll be using quite a bit
	const $body = $('body');
	const $allStoriesList = $('#all-articles-list');
	const $submitForm = $('#submit-form');
	const $favoritedStories = $('#favorited-articles');
	const $filteredArticles = $('#filtered-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $ownStories = $('#my-articles');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $userProfile = $('#user-profile');
	// global storyList variable
	let storyList = null;
	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();
	//_____________________
	//EVENT LISTENERS
	//_____________________
	/**
	 * Event listener for logging in.
	 *  If successfully we will setup the user instance
	 */
	$loginForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page-refresh on submit
		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Event listener for signing up.
	 *  If successfully we will setup a new user instance
	 */

	$createAccountForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page refresh
		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();
		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Log Out Functionality
	 */

	$navLogOut.on('click', function() {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});
	/**
	 * Event Handler for Clicking Login
	 */
	$navLogin.on('click', function() {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});
	/**
	 * Event handler for Navigation to Homepage
	 */
	$('body').on('click', '#nav-all', async function() {
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	//function for clicking on star, adding or removing from favorites
	$('.articles-container').on('click', '.star', function(e) {
		e.preventDefault();
		const $tgt = $(e.target);
		const $closestLi = $tgt.closest('li');
		const storyId = $closestLi.attr('id');
		//after constants set up we toggle between classes to change CSS and manipulate the DOM
		let star = $(e.target);
		if (star.hasClass('fas')) {
			$tgt.closest('i').toggleClass('fas far');
			currentUser.removeFavorite(storyId);
			$allStoriesList.remove($closestLi);
		} else {
			$tgt.closest('i').toggleClass('fas far');
			currentUser.addFavorite(storyId);
		}
	});
	function submitClick() {
		$('#nav-submit').on('click', async function(e) {
			e.preventDefault();
			$submitForm.slideToggle();
			console.log('click');
		});
	}
	submitClick();

	//function for clicking on favorites tab
	$body.on('click', '#nav-favorites', function() {
		hideElements();
		if (currentUser) {
			generateFaves();
			$favoritedStories.show();
		}
	});
	//hide faves so they don't show up on homepage
	$body.on('click', '#nav-all', function() {
		$favoritedStories.hide();
		console.log('click');
	});
	//evt handler for clicking on my stories in navbat
	$body.on('click', '#nav-my-stories', function() {
		hideElements();
		if (currentUser) {
			$favoritedStories.hide();
			$userProfile.hide();
			generateMyStories();
			$ownStories.show();
		}
	});
	//deleting a story upon a trash can click
	$('.articles-container').on('click', '.trash-can', async function(e) {
		const $tgt = $(e.target);
		const $closestLi = $tgt.closest('li');
		const storyId = $closestLi.attr('id');

		e.preventDefault();
		console.log('click');
		await storyList.deleteStory(currentUser, storyId);
		$closestLi.remove();
	});
	/**
	 * On page load, checks local storage to see if the user is already logged in.
	 * Renders page information accordingly.
	 */
	//_____________________
	//LOGGING IN
	//_____________________
	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
		}
	}
	/**
	 * A rendering function to run to reset the forms and hide the login info
	 */
	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$userProfile.hide();
		$navLogOut.show();
		$('.main-nav-links, #user-profile').toggleClass('hidden');
		$('#nav-welcome').show();
	}
	//_____________________
	//HELPERS
	//_____________________
	/**
   * A function to render HTML for an individual Story instance
   // - story: an instance of Story
  //  * - isOwnStory: was the story posted by the current user
  //  */
	/* simple function to pull the hostname from a URL */
	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		} else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	function generateStoryHTML(story, isOwnStory) {
		let hostName = getHostName(story.url);
		let starType = isFavorite(story) ? 'fas' : 'far';

		// render a trash can for deleting your own story
		const trashCanIcon = isOwnStory
			? `<span class="trash-can">
	  <i class="fas fa-trash-alt"></i>
	</span>`
			: '';
		// render story markup
		const storyMarkup = $(`
  <li id="${story.storyId}">
  ${trashCanIcon}
  <span class="star">
	<i class="${starType} fa-star"></i>
	</span>
	<span class="star">
	<a class="article-link" href="${story.url}" target="a_blank">
	  <strong>${story.title}</strong>
	</a>
	<small class="article-author">by ${story.author}</small>
	<small class="article-hostname ${hostName}">(${hostName})</small>
	<small class="article-username">posted by ${story.username}</small>
  </li>
`);

		return storyMarkup;
	}
	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}
	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}
	//________________
	//FAVORITES
	//________________
	/* see if a specific story is in the user's list of favorites */

	//function for adding story to set of favorites, or determining if it there
	function isFavorite(story) {
		let favStoryIds = new Set();
		if (currentUser) {
			favStoryIds = new Set(currentUser.favorites.map((obj) => obj.storyId));
		}
		return favStoryIds.has(story.storyId);
	}
	/**
	 * A function to add a new story to the DOM if a user is logged in
	 */

	//to use in evt handler for clicking on favorites tab
	function generateFaves() {
		// empty out the list by default
		$favoritedStories.empty();

		// if the user has no favorites
		if (currentUser.favorites.length === 0) {
			$favoritedStories.append(
				'<h5>No favorites added yet. To add a favorite, click the star to the left of a story.</h5>'
			);
		} else {
			// for all of the user's favorites
			for (let story of currentUser.favorites) {
				// render each story in the list
				let favoriteHTML = generateStoryHTML(story, false, true);
				$favoritedStories.append(favoriteHTML);
			}
		}
	}
	//_________________
	//STORY SUBMISSION
	//_________________
	//adds user story to list of stories
	function addUserStory() {
		$submitForm.on('click', '#story-submit-btn', async function(e) {
			e.preventDefault();
			console.log('click');
			let username = currentUser.username;
			let author = currentUser.name;
			let url = $('#url').val();
			let title = $('#title').val();
			let storyAdded = await storyList.addStory(currentUser, {
				title,
				author,
				url,
				username
			});
			let theLatestStory = generateStoryHTML(storyAdded, true);
			$('#all-articles-list').prepend(theLatestStory);
			//$ownStories.append(theLatestStory);
			// hide the form and reset it
			$submitForm.slideUp('slow');
			$submitForm.trigger('reset');
		});
	}

	addUserStory();

	//function to grab own stories
	function generateMyStories() {
		$ownStories.empty();
		// if the user has no stories that they have posted
		if (currentUser.ownStories.length === 0) {
			$ownStories.append('<h5>No stories added by user yet!</h5>');
		} else {
			// for all of the user's posted stories
			for (let story of currentUser.ownStories) {
				// render each story in the list
				let ownStoryHTML = generateStoryHTML(story, true);
				$ownStories.append(ownStoryHTML);
			}
		}

		$ownStories.show();
	}
}); //this is the wrap
