export const getTracks = (req, res) => {
  try {
    const plannedTracks = ["Access Control Track"];
    res.json({ plannedTracks });
  } catch (err) {
    res.status(500).json({
      error:
        "The system encountered an error while retrieving the student's track information.",
    });
  }
};