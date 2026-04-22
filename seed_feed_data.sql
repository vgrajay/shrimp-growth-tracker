-- Run this in Supabase SQL Editor to insert the feed details
DO $$
DECLARE
    v_farm2_id uuid;
    v_farm3_id uuid;
    v_farm1_id uuid;
    v_log_id uuid;
    v_user_id uuid;
    
    -- Variables for feeding time IDs (Farm 2)
    v_ft_7am uuid;
    v_ft_1030am uuid;
    v_ft_12pm uuid;
    v_ft_2pm uuid;
    v_ft_5pm uuid;
    v_ft_530pm uuid;

BEGIN
    -- Get the first available user
    SELECT user_id INTO v_user_id FROM profiles LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in the profiles table';
    END IF;

    -- Clean up mistakenly seeded data for Farm 1
    SELECT id INTO v_farm1_id FROM farms WHERE name ILIKE '%farm 1%' OR name ILIKE '%farm1%' LIMIT 1;
    IF v_farm1_id IS NOT NULL THEN
        -- Safely delete only the feed entries from Mar 24 to Apr 06 on Farm 1 that we mistakenly inserted
        DELETE FROM feed_entries WHERE log_id IN (
            SELECT id FROM daily_logs WHERE farm_id = v_farm1_id AND date >= '2026-03-24' AND date <= '2026-04-06'
        );
    END IF;

    -- Get or create Farm 2
    SELECT id INTO v_farm2_id FROM farms WHERE name ILIKE '%farm 2%' OR name ILIKE '%farm2%' LIMIT 1;
    IF v_farm2_id IS NULL THEN
        INSERT INTO farms (name, user_id) VALUES ('Farm 2', v_user_id) RETURNING id INTO v_farm2_id;
    END IF;

    -- Get or create Farm 3
    SELECT id INTO v_farm3_id FROM farms WHERE name ILIKE '%farm 3%' OR name ILIKE '%farm3%' LIMIT 1;
    IF v_farm3_id IS NULL THEN
        INSERT INTO farms (name, user_id) VALUES ('Farm 3', v_user_id) RETURNING id INTO v_farm3_id;
    END IF;

    ------------------------------------------------------------------------------------------------
    -- FARM 2 DATA
    ------------------------------------------------------------------------------------------------

    -- Standardize feeding times for Farm 2
    SELECT id INTO v_ft_7am FROM feeding_times WHERE label = '7:00 AM' AND farm_id = v_farm2_id LIMIT 1;
    IF v_ft_7am IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('7:00 AM', 1, v_farm2_id) RETURNING id INTO v_ft_7am; END IF;
    SELECT id INTO v_ft_1030am FROM feeding_times WHERE label = '10:30 AM' AND farm_id = v_farm2_id LIMIT 1;
    IF v_ft_1030am IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('10:30 AM', 2, v_farm2_id) RETURNING id INTO v_ft_1030am; END IF;
    SELECT id INTO v_ft_12pm FROM feeding_times WHERE label = '12:00 PM' AND farm_id = v_farm2_id LIMIT 1;
    IF v_ft_12pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('12:00 PM', 3, v_farm2_id) RETURNING id INTO v_ft_12pm; END IF;
    SELECT id INTO v_ft_2pm FROM feeding_times WHERE label = '2:00 PM' AND farm_id = v_farm2_id LIMIT 1;
    IF v_ft_2pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('2:00 PM', 4, v_farm2_id) RETURNING id INTO v_ft_2pm; END IF;
    SELECT id INTO v_ft_5pm FROM feeding_times WHERE label = '5:00 PM' AND farm_id = v_farm2_id LIMIT 1;
    IF v_ft_5pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('5:00 PM', 5, v_farm2_id) RETURNING id INTO v_ft_5pm; END IF;
    SELECT id INTO v_ft_530pm FROM feeding_times WHERE label = '5:30 PM' AND farm_id = v_farm2_id LIMIT 1;
    IF v_ft_530pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('5:30 PM', 6, v_farm2_id) RETURNING id INTO v_ft_530pm; END IF;

    -- Day 2026-03-19
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-19', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-19' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.15, true, v_user_id), (v_log_id, v_ft_12pm, 1.15, true, v_user_id), (v_log_id, v_ft_5pm, 1.15, true, v_user_id);

    -- Day 2026-03-20
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-20', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-20' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.25, true, v_user_id), (v_log_id, v_ft_12pm, 1.25, true, v_user_id), (v_log_id, v_ft_5pm, 1.25, true, v_user_id);

    -- Day 2026-03-21
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-21', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-21' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.4, true, v_user_id), (v_log_id, v_ft_12pm, 1.4, true, v_user_id), (v_log_id, v_ft_5pm, 1.4, true, v_user_id);

    -- Day 2026-03-22
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-22', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-22' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.6, true, v_user_id), (v_log_id, v_ft_12pm, 1.6, true, v_user_id), (v_log_id, v_ft_5pm, 1.6, true, v_user_id);

    -- Day 2026-03-23
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-23', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-23' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.8, true, v_user_id), (v_log_id, v_ft_12pm, 1.8, true, v_user_id), (v_log_id, v_ft_5pm, 1.8, true, v_user_id);

    -- Day 2026-03-24
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-24', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-24' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.95, true, v_user_id), (v_log_id, v_ft_12pm, 1.95, true, v_user_id), (v_log_id, v_ft_5pm, 1.95, true, v_user_id);

    -- Day 2026-03-25
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-25', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-25' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.1, true, v_user_id), (v_log_id, v_ft_12pm, 2.1, true, v_user_id), (v_log_id, v_ft_5pm, 2.1, true, v_user_id);

    -- Day 2026-03-26
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-26', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-26' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.5, true, v_user_id), (v_log_id, v_ft_1030am, 1.5, true, v_user_id), (v_log_id, v_ft_2pm, 1.5, true, v_user_id), (v_log_id, v_ft_530pm, 1.5, true, v_user_id);

    -- Day 2026-03-27
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-27', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-27' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.8, true, v_user_id), (v_log_id, v_ft_1030am, 1.8, true, v_user_id), (v_log_id, v_ft_2pm, 1.8, true, v_user_id), (v_log_id, v_ft_530pm, 1.8, true, v_user_id);

    -- Day 2026-03-28
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-28', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-28' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.5, true, v_user_id), (v_log_id, v_ft_1030am, 1.9, true, v_user_id), (v_log_id, v_ft_2pm, 1.9, true, v_user_id), (v_log_id, v_ft_530pm, 1.9, true, v_user_id);

    -- Day 2026-03-29
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-29', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-29' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.1, true, v_user_id), (v_log_id, v_ft_1030am, 2.1, true, v_user_id), (v_log_id, v_ft_2pm, 2.1, true, v_user_id), (v_log_id, v_ft_530pm, 2.1, true, v_user_id);

    -- Day 2026-03-30
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-30', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-30' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.0, true, v_user_id), (v_log_id, v_ft_1030am, 2.0, true, v_user_id), (v_log_id, v_ft_2pm, 2.0, true, v_user_id), (v_log_id, v_ft_530pm, 2.0, true, v_user_id);

    -- Day 2026-03-31
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-31', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-31' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.0, true, v_user_id), (v_log_id, v_ft_1030am, 2.0, true, v_user_id), (v_log_id, v_ft_2pm, 2.0, true, v_user_id), (v_log_id, v_ft_530pm, 2.0, true, v_user_id);

    -- Day 2026-04-01
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-01', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-01' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.0, true, v_user_id), (v_log_id, v_ft_1030am, 1.0, true, v_user_id), (v_log_id, v_ft_2pm, 1.0, true, v_user_id), (v_log_id, v_ft_530pm, 1.0, true, v_user_id);

    -- Day 2026-04-02
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-02', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-02' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.2, true, v_user_id), (v_log_id, v_ft_1030am, 1.2, true, v_user_id), (v_log_id, v_ft_2pm, 1.2, true, v_user_id), (v_log_id, v_ft_530pm, 1.2, true, v_user_id);

    -- Day 2026-04-03
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-03', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-03' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.0, true, v_user_id), (v_log_id, v_ft_1030am, 2.0, true, v_user_id), (v_log_id, v_ft_2pm, 2.0, true, v_user_id), (v_log_id, v_ft_530pm, 2.0, true, v_user_id);

    -- Day 2026-04-04
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-04', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-04' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.1, true, v_user_id), (v_log_id, v_ft_1030am, 2.3, true, v_user_id), (v_log_id, v_ft_2pm, 2.4, true, v_user_id), (v_log_id, v_ft_530pm, 2.4, true, v_user_id);

    -- Day 2026-04-05
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-05', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-05' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.5, true, v_user_id), (v_log_id, v_ft_1030am, 2.6, true, v_user_id), (v_log_id, v_ft_2pm, 2.7, true, v_user_id), (v_log_id, v_ft_530pm, 2.7, true, v_user_id);

    -- Day 2026-04-06
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-06', v_farm2_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-06' AND farm_id = v_farm2_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.6, true, v_user_id), (v_log_id, v_ft_1030am, 2.6, true, v_user_id), (v_log_id, v_ft_2pm, 2.6, true, v_user_id), (v_log_id, v_ft_530pm, 2.6, true, v_user_id);


    ------------------------------------------------------------------------------------------------
    -- FARM 3 DATA
    ------------------------------------------------------------------------------------------------

    -- Standardize feeding times for Farm 3
    SELECT id INTO v_ft_7am FROM feeding_times WHERE label = '7:00 AM' AND farm_id = v_farm3_id LIMIT 1;
    IF v_ft_7am IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('7:00 AM', 1, v_farm3_id) RETURNING id INTO v_ft_7am; END IF;
    SELECT id INTO v_ft_1030am FROM feeding_times WHERE label = '10:30 AM' AND farm_id = v_farm3_id LIMIT 1;
    IF v_ft_1030am IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('10:30 AM', 2, v_farm3_id) RETURNING id INTO v_ft_1030am; END IF;
    SELECT id INTO v_ft_12pm FROM feeding_times WHERE label = '12:00 PM' AND farm_id = v_farm3_id LIMIT 1;
    IF v_ft_12pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('12:00 PM', 3, v_farm3_id) RETURNING id INTO v_ft_12pm; END IF;
    SELECT id INTO v_ft_2pm FROM feeding_times WHERE label = '2:00 PM' AND farm_id = v_farm3_id LIMIT 1;
    IF v_ft_2pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('2:00 PM', 4, v_farm3_id) RETURNING id INTO v_ft_2pm; END IF;
    SELECT id INTO v_ft_5pm FROM feeding_times WHERE label = '5:00 PM' AND farm_id = v_farm3_id LIMIT 1;
    IF v_ft_5pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('5:00 PM', 5, v_farm3_id) RETURNING id INTO v_ft_5pm; END IF;
    SELECT id INTO v_ft_530pm FROM feeding_times WHERE label = '5:30 PM' AND farm_id = v_farm3_id LIMIT 1;
    IF v_ft_530pm IS NULL THEN INSERT INTO feeding_times (label, sort_order, farm_id) VALUES ('5:30 PM', 6, v_farm3_id) RETURNING id INTO v_ft_530pm; END IF;

    -- Day 2026-03-19
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-19', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-19' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.15, true, v_user_id), (v_log_id, v_ft_12pm, 1.15, true, v_user_id), (v_log_id, v_ft_5pm, 1.15, true, v_user_id);

    -- Day 2026-03-20
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-20', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-20' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.25, true, v_user_id), (v_log_id, v_ft_12pm, 1.25, true, v_user_id), (v_log_id, v_ft_5pm, 1.25, true, v_user_id);

    -- Day 2026-03-21
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-21', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-21' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.4, true, v_user_id), (v_log_id, v_ft_12pm, 1.4, true, v_user_id), (v_log_id, v_ft_5pm, 1.4, true, v_user_id);

    -- Day 2026-03-22
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-22', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-22' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.6, true, v_user_id), (v_log_id, v_ft_12pm, 1.6, true, v_user_id), (v_log_id, v_ft_5pm, 1.6, true, v_user_id);

    -- Day 2026-03-23
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-23', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-23' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.8, true, v_user_id), (v_log_id, v_ft_12pm, 1.8, true, v_user_id), (v_log_id, v_ft_5pm, 1.8, true, v_user_id);

    -- Day 2026-03-24
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-24', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-24' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.95, true, v_user_id), (v_log_id, v_ft_12pm, 1.95, true, v_user_id), (v_log_id, v_ft_5pm, 1.95, true, v_user_id);

    -- Day 2026-03-25
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-25', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-25' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.1, true, v_user_id), (v_log_id, v_ft_12pm, 2.1, true, v_user_id), (v_log_id, v_ft_5pm, 2.1, true, v_user_id);

    -- Day 2026-03-26
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-26', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-26' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.8, true, v_user_id), (v_log_id, v_ft_1030am, 1.8, true, v_user_id), (v_log_id, v_ft_2pm, 1.8, true, v_user_id), (v_log_id, v_ft_530pm, 1.8, true, v_user_id);

    -- Day 2026-03-27
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-27', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-27' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 1.8, true, v_user_id), (v_log_id, v_ft_1030am, 1.8, true, v_user_id), (v_log_id, v_ft_2pm, 1.8, true, v_user_id), (v_log_id, v_ft_530pm, 1.8, true, v_user_id);

    -- Day 2026-03-28
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-28', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-28' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.4, true, v_user_id), (v_log_id, v_ft_1030am, 2.0, true, v_user_id), (v_log_id, v_ft_2pm, 2.0, true, v_user_id), (v_log_id, v_ft_530pm, 2.0, true, v_user_id);

    -- Day 2026-03-29
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-29', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-29' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.1, true, v_user_id), (v_log_id, v_ft_1030am, 2.1, true, v_user_id), (v_log_id, v_ft_2pm, 2.1, true, v_user_id), (v_log_id, v_ft_530pm, 2.1, true, v_user_id);

    -- Day 2026-03-30
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-30', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-30' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.5, true, v_user_id), (v_log_id, v_ft_1030am, 2.5, true, v_user_id), (v_log_id, v_ft_2pm, 2.5, true, v_user_id), (v_log_id, v_ft_530pm, 2.5, true, v_user_id);

    -- Day 2026-03-31
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-03-31', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-03-31' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 2.5, true, v_user_id), (v_log_id, v_ft_1030am, 2.5, true, v_user_id), (v_log_id, v_ft_2pm, 2.5, true, v_user_id), (v_log_id, v_ft_530pm, 2.5, true, v_user_id);

    -- Day 2026-04-01
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-01', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-01' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 3.8, true, v_user_id), (v_log_id, v_ft_1030am, 3.8, true, v_user_id), (v_log_id, v_ft_2pm, 4.5, true, v_user_id), (v_log_id, v_ft_530pm, 4.5, true, v_user_id);

    -- Day 2026-04-02
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-02', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-02' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 4.8, true, v_user_id), (v_log_id, v_ft_1030am, 4.8, true, v_user_id), (v_log_id, v_ft_2pm, 4.8, true, v_user_id), (v_log_id, v_ft_530pm, 4.8, true, v_user_id);

    -- Day 2026-04-03
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-03', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-03' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 4.5, true, v_user_id), (v_log_id, v_ft_1030am, 4.8, true, v_user_id), (v_log_id, v_ft_2pm, 4.8, true, v_user_id), (v_log_id, v_ft_530pm, 4.8, true, v_user_id);

    -- Day 2026-04-04
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-04', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-04' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 4.9, true, v_user_id), (v_log_id, v_ft_1030am, 5.2, true, v_user_id), (v_log_id, v_ft_2pm, 5.6, true, v_user_id), (v_log_id, v_ft_530pm, 5.6, true, v_user_id);

    -- Day 2026-04-05
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-05', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-05' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 5.9, true, v_user_id), (v_log_id, v_ft_1030am, 6.0, true, v_user_id), (v_log_id, v_ft_2pm, 6.1, true, v_user_id), (v_log_id, v_ft_530pm, 6.1, true, v_user_id);

    -- Day 2026-04-06
    INSERT INTO daily_logs (date, farm_id) VALUES ('2026-04-06', v_farm3_id) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;
    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '2026-04-06' AND farm_id = v_farm3_id; END IF;
    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES 
        (v_log_id, v_ft_7am, 6.0, true, v_user_id), (v_log_id, v_ft_1030am, 6.0, true, v_user_id), (v_log_id, v_ft_2pm, 6.0, true, v_user_id), (v_log_id, v_ft_530pm, 6.0, true, v_user_id);


END $$;
