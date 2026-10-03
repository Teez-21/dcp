export type CharacterRecord = {
  id: string;
  name: string;
  image_path: string | null;
  contact: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  character_type: string;
  created_at: string;
  updated_at: string;
};

export type CharacterDraft = {
  name: string;
  character_type: string;
  contact: string;
  facebook_url: string;
  instagram_url: string;
  x_url: string;
};

export type CharacterProposalDraft = CharacterDraft & {
  source_note: string;
  website: string;
};

export type CharacterSubmissionRecord = {
  id: string;
  name: string;
  character_type: string;
  contact: string;
  facebook_url: string;
  instagram_url: string;
  x_url: string;
  source_note: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
