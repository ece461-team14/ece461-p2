export const getTracks = (req, res) => {
  try {
    const tracks = ["Access control track"];
    res.json({ tracks });
  } catch (err) {
    res.status(500).json({
      error:
        "The system encountered an error while retrieving the student's track information.",
    });
  }
};
