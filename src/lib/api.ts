import type { ProcessingJob, ModelProvider } from '@/types';
import supabase from './supabase';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function scrapeProfile(
  usernames: string[]
): Promise<{ job_id: string }> {
  const user_id = await getUserId();
  const { data, error } = await supabase.functions.invoke('scrape-profiles', {
    body: { usernames, user_id },
  });

  if (error) {
    throw new Error(`Failed to start scrape job: ${error.message}`);
  }

  // Edge function may return error in body when --no-verify-jwt
  if (data?.error) {
    throw new Error(`Scrape failed: ${data.error}`);
  }

  return data as { job_id: string };
}

export async function getJobStatus(jobId: string): Promise<ProcessingJob> {
  const { data, error } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch job status: ${error.message}`);
  }

  return data as ProcessingJob;
}

export async function analyzeContent(
  reelIds: string[],
  modelProvider: ModelProvider,
  modelId: string
): Promise<{ job_id: string }> {
  const user_id = await getUserId();
  const { data, error } = await supabase.functions.invoke('analyze-content', {
    body: { reel_ids: reelIds, user_id, model_provider: modelProvider, model_id: modelId },
  });

  if (error) {
    throw new Error(`Failed to start analysis job: ${error.message}`);
  }

  return data as { job_id: string };
}

export async function generateVoiceProfile(
  profileId: string,
  reelIds: string[],
  modelProvider: ModelProvider,
  modelId: string
): Promise<{ job_id: string }> {
  const user_id = await getUserId();
  const { data, error } = await supabase.functions.invoke(
    'generate-voice-profile',
    {
      body: { profile_id: profileId, reel_ids: reelIds, user_id, model_provider: modelProvider, model_id: modelId },
    }
  );

  if (error) {
    throw new Error(`Failed to start voice profile generation: ${error.message}`);
  }

  return data as { job_id: string };
}

export async function generateScript(params: {
  topic: string;
  voice_profile_id?: string;
  reference_reel_ids?: string[];
  additional_instructions?: string;
  model_provider: ModelProvider;
  model_id: string;
}): Promise<{ job_id: string }> {
  const user_id = await getUserId();
  const { data, error } = await supabase.functions.invoke('generate-script', {
    body: { ...params, user_id },
  });

  if (error) {
    throw new Error(`Failed to start script generation: ${error.message}`);
  }

  return data as { job_id: string };
}
