-- Run this in Supabase SQL Editor to insert the feed details
DO $$
DECLARE
    v_farm_id uuid;
    v_log_id uuid;
    v_user_id uuid;
    
    -- Variables for feeding time IDs
    v_ft_7am uuid;
    v_ft_1030am uuid;
    v_ft_12pm uuid;
    v_ft_2pm uuid;
    v_ft_5pm uuid;
    v_ft_530pm uuid;

    -- Temporary record for iteration
    logs_rec RECORD;
    feed_rec RECORD;
BEGIN
    -- Get the first available user
    SELECT user_id INTO v_user_id FROM profiles LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in the profiles table';
    END IF;

    -- Get Farm 1 ID specifically
    SELECT id INTO v_farm_id FROM farms WHERE name ILIKE '%farm 1%' OR name ILIKE '%farm1%' LIMIT 1;
    
    -- Fallback to the oldest created farm if not found by name
    IF v_farm_id IS NULL THEN
        SELECT id INTO v_farm_id FROM farms ORDER BY created_at ASC LIMIT 1;
    END IF;
    
    IF v_farm_id IS NULL THEN
        RAISE EXCEPTION 'No farm found in the farms table';
    END IF;

    -- Look up or create feeding times to get their IDs
    SELECT id INTO v_ft_7am FROM feeding_times WHERE label = '7:00 AM' LIMIT 1;
    IF v_ft_7am IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('7:00 AM', 1, v_farm_id) RETURNING id INTO v_ft_7am; END IF;

    SELECT id INTO v_ft_1030am FROM feeding_times WHERE label = '10:30 AM' LIMIT 1;
    IF v_ft_1030am IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('10:30 AM', 2, v_farm_id) RETURNING id INTO v_ft_1030am; END IF;

    SELECT id INTO v_ft_12pm FROM feeding_times WHERE label = '12:00 PM' LIMIT 1;
    IF v_ft_12pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('12:00 PM', 3, v_farm_id) RETURNING id INTO v_ft_12pm; END IF;

    SELECT id INTO v_ft_2pm FROM feeding_times WHERE label = '2:00 PM' LIMIT 1;
    IF v_ft_2pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('2:00 PM', 4, v_farm_id) RETURNING id INTO v_ft_2pm; END IF;

    SELECT id INTO v_ft_5pm FROM feeding_times WHERE label = '5:00 PM' LIMIT 1;
    IF v_ft_5pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('5:00 PM', 5, v_farm_id) RETURNING id INTO v_ft_5pm; END IF;

    SELECT id INTO v_ft_530pm FROM feeding_times WHERE label = '5:30 PM' LIMIT 1;
    IF v_ft_530pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('5:30 PM', 6, v_farm_id) RETURNING id INTO v_ft_530pm; END IF;

    
    -- Day 8 (2026-03-24)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-24', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-24' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 3.9, true, v_user_id), (v_log_id, v_ft_12pm, 3.9, true, v_user_id), (v_log_id, v_ft_5pm, 3.9, true, v_user_id);

    -- Day 9 (2026-03-25)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-25', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-25' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 4.2, true, v_user_id), (v_log_id, v_ft_12pm, 4.2, true, v_user_id), (v_log_id, v_ft_5pm, 4.2, true, v_user_id);

    -- Day 10 (2026-03-26)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-26', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-26' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 3.3, true, v_user_id), (v_log_id, v_ft_1030am, 3.3, true, v_user_id), (v_log_id, v_ft_2pm, 3.3, true, v_user_id), (v_log_id, v_ft_530pm, 3.3, true, v_user_id);

    -- Day 11 (2026-03-27)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-27', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-27' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 3.6, true, v_user_id), (v_log_id, v_ft_1030am, 3.6, true, v_user_id), (v_log_id, v_ft_2pm, 3.6, true, v_user_id), (v_log_id, v_ft_530pm, 3.6, true, v_user_id);

    -- Day 12 (2026-03-28)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-28', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-28' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 3.9, true, v_user_id), (v_log_id, v_ft_1030am, 3.9, true, v_user_id), (v_log_id, v_ft_2pm, 3.9, true, v_user_id), (v_log_id, v_ft_530pm, 3.9, true, v_user_id);

    -- Day 13 (2026-03-29)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-29', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-29' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 4.2, true, v_user_id), (v_log_id, v_ft_1030am, 4.2, true, v_user_id), (v_log_id, v_ft_2pm, 4.2, true, v_user_id), (v_log_id, v_ft_530pm, 4.2, true, v_user_id);

    -- Day 14 (2026-03-30)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-30', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-30' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 4.5, true, v_user_id), (v_log_id, v_ft_1030am, 4.5, true, v_user_id), (v_log_id, v_ft_2pm, 4.5, true, v_user_id), (v_log_id, v_ft_530pm, 4.5, true, v_user_id);

    -- Day 15 (2026-03-31)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-31', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-31' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 4.5, true, v_user_id), (v_log_id, v_ft_1030am, 4.5, true, v_user_id), (v_log_id, v_ft_2pm, 4.5, true, v_user_id), (v_log_id, v_ft_530pm, 4.5, true, v_user_id);

    -- Day 16 (2026-04-01)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-01', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-01' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 4.8, true, v_user_id), (v_log_id, v_ft_1030am, 4.8, true, v_user_id), (v_log_id, v_ft_2pm, 4.8, true, v_user_id), (v_log_id, v_ft_530pm, 4.8, true, v_user_id);

    -- Day 17 (2026-04-02)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-02', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-02' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 6.0, true, v_user_id), (v_log_id, v_ft_1030am, 6.0, true, v_user_id), (v_log_id, v_ft_2pm, 6.0, true, v_user_id), (v_log_id, v_ft_530pm, 6.0, true, v_user_id);

    -- Day 18 (2026-04-03)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-03', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-03' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 6.5, true, v_user_id), (v_log_id, v_ft_1030am, 6.8, true, v_user_id), (v_log_id, v_ft_2pm, 6.8, true, v_user_id), (v_log_id, v_ft_530pm, 6.8, true, v_user_id);

    -- Day 19 (2026-04-04)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-04', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-04' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 7.0, true, v_user_id), (v_log_id, v_ft_1030am, 7.5, true, v_user_id), (v_log_id, v_ft_2pm, 8.0, true, v_user_id), (v_log_id, v_ft_530pm, 8.0, true, v_user_id);

    -- Day 20 (2026-04-05)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-05', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-05' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 8.4, true, v_user_id), (v_log_id, v_ft_1030am, 8.6, true, v_user_id), (v_log_id, v_ft_2pm, 8.8, true, v_user_id), (v_log_id, v_ft_530pm, 8.8, true, v_user_id);

    -- Day 21 (2026-04-06)
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-06', v_farm_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-06' AND farm_id = v_farm_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 8.6, true, v_user_id), (v_log_id, v_ft_1030am, 8.6, true, v_user_id), (v_log_id, v_ft_2pm, 8.6, true, v_user_id), (v_log_id, v_ft_530pm, 8.6, true, v_user_id);

END $$;
