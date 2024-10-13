// Gemini API key (replace with your actual key)
const GEMINI_API_KEY = '';

// DOM elements
const ingredientInput = document.getElementById('ingredient-input');
const addIngredientBtn = document.getElementById('add-ingredient');
const ingredientList = document.getElementById('ingredient-list');
const findRecipesBtn = document.getElementById('find-recipes');
const recipeList = document.getElementById('recipe-list');
const generateMealPlanBtn = document.getElementById('generate-meal-plan');
const mealPlanList = document.getElementById('meal-plan-list');
const generateShoppingListBtn = document.getElementById('generate-shopping-list');
const shoppingListItems = document.getElementById('shopping-list-items');

// State variables
let availableIngredients = [];
let currentMealPlan = [];

// Event Listeners
addIngredientBtn.addEventListener('click', addIngredient);
findRecipesBtn.addEventListener('click', findRecipes);
generateMealPlanBtn.addEventListener('click', generateMealPlan);
generateShoppingListBtn.addEventListener('click', generateShoppingList);

// Functions

/**
 * Adds an ingredient to the list
 */
function addIngredient() {
  const ingredient = ingredientInput.value.trim().toLowerCase();
  if (ingredient && !availableIngredients.includes(ingredient)) {
    availableIngredients.push(ingredient);
    updateIngredientList();
    ingredientInput.value = '';
  }
}

/**
 * Updates the ingredient list in the UI
 */
function updateIngredientList() {
  ingredientList.innerHTML = '';
  availableIngredients.forEach(ingredient => {
    const li = document.createElement('li');
    li.textContent = ingredient;
    ingredientList.appendChild(li);
  });
}

/**
 * Finds recipes based on available ingredients
 */
async function findRecipes() {
  const recipes = await getRecipesFromGemini(availableIngredients);
  displayRecipes(recipes);
}

/**
 * Generates a meal plan
 */
async function generateMealPlan() {
  currentMealPlan = await getMealPlanFromGemini();
  displayMealPlan(currentMealPlan);
}

/**
 * Generates a shopping list
 */
async function generateShoppingList() {
  const shoppingList = await getShoppingListFromGemini(currentMealPlan, availableIngredients);
  displayShoppingList(shoppingList);
}

/**
 * Calls Gemini API to get recipes
 * @param {string[]} ingredients - List of available ingredients
 * @returns {Promise<Object[]>} - List of recipe objects
 */
async function getRecipesFromGemini(ingredients) {
  const prompt = `Suggest 3 recipes using some or all of these ingredients: ${ingredients.join(', ')}. Format each recipe as follows:
1. Recipe Title
- Ingredient 1
- Ingredient 2
- Ingredient 3
...

2. Recipe Title
...

3. Recipe Title
...`;
  const response = await callGeminiAPI(prompt);
  return parseRecipes(response);
}

/**
 * Calls Gemini API to get a meal plan
 * @returns {Promise<Object[]>} - List of meal plan objects
 */
async function getMealPlanFromGemini() {
  const prompt = `Generate a 7-day meal plan with breakfast, lunch, and dinner for each day. For each meal, provide the name of the dish and a list of all required ingredients. Format the response as follows:

Day 1:
Breakfast: [Dish Name]
- Ingredient 1
- Ingredient 2
...
Lunch: [Dish Name]
- Ingredient 1
- Ingredient 2
...
Dinner: [Dish Name]
- Ingredient 1
- Ingredient 2
...

Day 2:
...`;

  const response = await callGeminiAPI(prompt);
  return parseMealPlan(response);
}

/**
 * Calls Gemini API to get a shopping list
 * @param {Object[]} mealPlan - Current meal plan
 * @param {string[]} availableIngredients - List of available ingredients
 * @returns {Promise<string[]>} - Shopping list items
 */
async function getShoppingListFromGemini(mealPlan, availableIngredients) {
  const mealPlanText = mealPlan.map(day => day.join('\n')).join('\n\n');
  const prompt = `Generate a shopping list based on the following meal plan:\n\n${mealPlanText}\n\nAvailable ingredients: ${availableIngredients.join(', ')}\n\nProvide a list of items to buy, excluding the available ingredients.`;
  const response = await callGeminiAPI(prompt);
  return parseShoppingList(response);
}

/**
 * Calls the Gemini API
 * @param {string} prompt - The prompt to send to the API
 * @returns {Promise<string>} - The API response
 */
async function callGeminiAPI(prompt) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return '';
  }
}

/**
 * Parses the recipes from the API response
 * @param {string} response - The API response
 * @returns {Object[]} - List of recipe objects
 */
function parseRecipes(response) {
  try {
    const recipeStrings = response.split(/\d+\.\s/).filter(Boolean);
    
    return recipeStrings.map(recipeString => {
      const [title, ...ingredientLines] = recipeString.split('\n').filter(Boolean);
      const ingredients = ingredientLines.map(line => line.trim().replace(/^-\s*/, ''));
      
      return { title: title.trim(), ingredients };
    });
  } catch (error) {
    console.error('Error parsing recipes:', error);
    return [];
  }
}

/**
 * Parses the meal plan from the API response
 * @param {string} response - The API response
 * @returns {Object[]} - List of meal plan objects
 */
function parseMealPlan(response) {
  try {
    const days = response.split(/Day \d+:/g).filter(Boolean);
    return days.map(day => {
      const meals = day.trim().split(/(?:Breakfast|Lunch|Dinner):/g).filter(Boolean);
      return meals.map(meal => {
        const [name, ...ingredients] = meal.trim().split('\n');
        return `${name.trim()}\n${ingredients.join('\n')}`;
      });
    });
  } catch (error) {
    console.error('Error parsing meal plan:', error);
    return [];
  }
}

/**
 * Parses the shopping list from the API response
 * @param {string} response - The API response
 * @returns {string[]} - List of shopping items
 */
function parseShoppingList(response) {
  // Implement parsing logic based on the API response format
  // This is a placeholder and should be updated based on the actual response structure
  try {
    const shoppingList = response.split('\n').filter(Boolean).map(item => item.trim());
    return shoppingList;
  } catch (error) {
    console.error('Error parsing shopping list:', error);
    return [];
  }
}

/**
 * Displays recipes in the UI
 * @param {Object[]} recipes - List of recipe objects
 */
function displayRecipes(recipes) {
  recipeList.innerHTML = '';
  if (Array.isArray(recipes) && recipes.length > 0) {
    recipes.forEach(recipe => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${recipe.title}</strong><br>Ingredients: ${recipe.ingredients.join(', ')}`;
      recipeList.appendChild(li);
    });
  } else {
    recipeList.innerHTML = '<li>No recipes found or invalid data returned.</li>';
  }
}

/**
 * Displays the meal plan in the UI
 * @param {Object[]} mealPlan - List of meal plan objects
 */
function displayMealPlan(mealPlan) {
  mealPlanList.innerHTML = '';
  if (Array.isArray(mealPlan) && mealPlan.length > 0) {
    mealPlan.forEach((day, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>Day ${index + 1}</strong><br>
        <strong>Breakfast:</strong> ${day[0]}<br>
        <strong>Lunch:</strong> ${day[1]}<br>
        <strong>Dinner:</strong> ${day[2]}`;
      mealPlanList.appendChild(li);
    });
  } else {
    mealPlanList.innerHTML = '<li>No meal plan found or invalid data returned.</li>';
  }
}

/**
 * Displays the shopping list in the UI
 * @param {string[]} shoppingList - List of shopping items
 */
function displayShoppingList(shoppingList) {
  shoppingListItems.innerHTML = '';
  if (Array.isArray(shoppingList) && shoppingList.length > 0) {
    shoppingList.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      shoppingListItems.appendChild(li);
    });
  } else {
    shoppingListItems.innerHTML = '<li>No shopping list items found or invalid data returned.</li>';
  }
}
