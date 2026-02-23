// pets.js — Maps URL paths to controller functions for pet-related actions.
//
// All routes here are automatically prefixed with /api/pets
// because of how they're registered in app.js:
//   app.use('/api/pets', require('./routes/pets'))
//
// All routes require auth. Update and delete also verify ownership in the controller.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const petsController = require('../controllers/petsController');

// GET /api/pets — returns all pets belonging to the signed-in user
router.get('/', requireAuth(), petsController.getMyPets);

// POST /api/pets — creates a new pet for the signed-in user
router.post('/', requireAuth(), petsController.createPet);

// PATCH /api/pets/:id — updates a specific pet (ownership verified in controller)
router.patch('/:id', requireAuth(), petsController.updatePet);

// DELETE /api/pets/:id — deletes a specific pet (ownership verified in controller)
router.delete('/:id', requireAuth(), petsController.deletePet);

module.exports = router;
