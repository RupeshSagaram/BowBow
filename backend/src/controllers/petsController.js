// petsController.js — Logic for pet-related endpoints.
//
// All endpoints require authentication (enforced by requireAuth() in the route file).
// req.auth.userId is the Clerk ID of the signed-in user.
//
// Important: Pet.userId stores our internal User.id (the cuid), NOT the Clerk ID.
// So every endpoint that touches pets must first look up the user by clerkId to get
// their internal id. This is one extra DB query but keeps foreign keys correct.
//
// getMyPets():  Returns all pets belonging to the signed-in user.
// createPet():  Creates a new pet linked to the signed-in user.
// updatePet():  Updates a pet — verifies ownership first (403 if not yours).
// deletePet():  Deletes a pet — verifies ownership first (403 if not yours).

const prisma = require('../utils/prismaClient');

// GET /api/pets
async function getMyPets(req, res) {
  const { userId } = req.auth; // Clerk ID

  try {
    // Look up our internal user record by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch all pets owned by this user, oldest first
    const pets = await prisma.pet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ pets });
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
}

// POST /api/pets
async function createPet(req, res) {
  const { userId } = req.auth;

  const { name, species, breed, age, weight, notes } = req.body;

  // name and species are required
  if (!name || !species) {
    return res.status(400).json({ error: 'name and species are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pet = await prisma.pet.create({
      data: {
        name,
        species,
        breed:  breed  || null,
        // parseFloat guards against the frontend sending these as strings
        age:    age    != null && age    !== '' ? parseFloat(age)    : null,
        weight: weight != null && weight !== '' ? parseFloat(weight) : null,
        notes:  notes  || null,
        userId: user.id, // internal DB id, not clerkId
      },
    });

    // 201 Created — correct status for a newly created resource
    res.status(201).json({ pet });
  } catch (error) {
    console.error('Error creating pet:', error);
    res.status(500).json({ error: 'Failed to create pet' });
  }
}

// PATCH /api/pets/:id
async function updatePet(req, res) {
  const { userId } = req.auth;
  const { id } = req.params;

  const { name, species, breed, age, weight, notes } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch the pet to check ownership before modifying it
    const existingPet = await prisma.pet.findUnique({
      where: { id },
    });

    if (!existingPet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // OWNERSHIP CHECK — prevents users from editing someone else's pet
    if (existingPet.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: this pet does not belong to you' });
    }

    // Build the update object from only the fields that were sent.
    // This allows partial updates — the caller doesn't have to send every field.
    const updateData = {};
    if (name    !== undefined) updateData.name    = name;
    if (species !== undefined) updateData.species = species;
    if (breed   !== undefined) updateData.breed   = breed   || null;
    if (age     !== undefined) updateData.age     = age     != null && age     !== '' ? parseFloat(age)    : null;
    if (weight  !== undefined) updateData.weight  = weight  != null && weight  !== '' ? parseFloat(weight) : null;
    if (notes   !== undefined) updateData.notes   = notes   || null;

    const pet = await prisma.pet.update({
      where: { id },
      data: updateData,
    });

    res.json({ pet });
  } catch (error) {
    console.error('Error updating pet:', error);
    res.status(500).json({ error: 'Failed to update pet' });
  }
}

// DELETE /api/pets/:id
async function deletePet(req, res) {
  const { userId } = req.auth;
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch the pet to check ownership before deleting it
    const existingPet = await prisma.pet.findUnique({
      where: { id },
    });

    if (!existingPet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // OWNERSHIP CHECK — prevents users from deleting someone else's pet
    if (existingPet.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: this pet does not belong to you' });
    }

    await prisma.pet.delete({
      where: { id },
    });

    // 204 No Content — success with nothing to return
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({ error: 'Failed to delete pet' });
  }
}

module.exports = { getMyPets, createPet, updatePet, deletePet };
