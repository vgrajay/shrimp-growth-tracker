import os

data_f2 = []
data_f3 = []

def add_day(date, times, amounts_f2, amounts_f3):
    data_f2.append((date, times, amounts_f2))
    data_f3.append((date, times, amounts_f3))

add_day('2026-03-19', ['7am', '12pm', '5pm'], [1.15, 1.15, 1.15], [1.15, 1.15, 1.15])
add_day('2026-03-20', ['7am', '12pm', '5pm'], [1.25, 1.25, 1.25], [1.25, 1.25, 1.25])
add_day('2026-03-21', ['7am', '12pm', '5pm'], [1.4, 1.4, 1.4], [1.4, 1.4, 1.4])
add_day('2026-03-22', ['7am', '12pm', '5pm'], [1.6, 1.6, 1.6], [1.6, 1.6, 1.6])
add_day('2026-03-23', ['7am', '12pm', '5pm'], [1.8, 1.8, 1.8], [1.8, 1.8, 1.8])
add_day('2026-03-24', ['7am', '12pm', '5pm'], [1.95, 1.95, 1.95], [1.95, 1.95, 1.95])
add_day('2026-03-25', ['7am', '12pm', '5pm'], [2.1, 2.1, 2.1], [2.1, 2.1, 2.1])
add_day('2026-03-26', ['7am', '1030am', '2pm', '530pm'], [1.5, 1.5, 1.5, 1.5], [1.8, 1.8, 1.8, 1.8])
add_day('2026-03-27', ['7am', '1030am', '2pm', '530pm'], [1.8, 1.8, 1.8, 1.8], [1.8, 1.8, 1.8, 1.8])
add_day('2026-03-28', ['7am', '1030am', '2pm', '530pm'], [1.5, 1.9, 1.9, 1.9], [2.4, 2.0, 2.0, 2.0])
add_day('2026-03-29', ['7am', '1030am', '2pm', '530pm'], [2.1, 2.1, 2.1, 2.1], [2.1, 2.1, 2.1, 2.1])
add_day('2026-03-30', ['7am', '1030am', '2pm', '530pm'], [2.0, 2.0, 2.0, 2.0], [2.5, 2.5, 2.5, 2.5])
add_day('2026-03-31', ['7am', '1030am', '2pm', '530pm'], [2.0, 2.0, 2.0, 2.0], [2.5, 2.5, 2.5, 2.5])
add_day('2026-04-01', ['7am', '1030am', '2pm', '530pm'], [1.0, 1.0, 1.0, 1.0], [3.8, 3.8, 4.5, 4.5])
add_day('2026-04-02', ['7am', '1030am', '2pm', '530pm'], [1.2, 1.2, 1.2, 1.2], [4.8, 4.8, 4.8, 4.8])
add_day('2026-04-03', ['7am', '1030am', '2pm', '530pm'], [2.0, 2.0, 2.0, 2.0], [4.5, 4.8, 4.8, 4.8])
add_day('2026-04-04', ['7am', '1030am', '2pm', '530pm'], [2.1, 2.3, 2.4, 2.4], [4.9, 5.2, 5.6, 5.6])
add_day('2026-04-05', ['7am', '1030am', '2pm', '530pm'], [2.5, 2.6, 2.7, 2.7], [5.9, 6.0, 6.1, 6.1])
add_day('2026-04-06', ['7am', '1030am', '2pm', '530pm'], [2.6, 2.6, 2.6, 2.6], [6.0, 6.0, 6.0, 6.0])

def generate_inserts(farm_var, data_list):
    lines = []
    for date, times, amounts in data_list:
        lines.append(f"    -- Day {date}")
        lines.append(f"    INSERT INTO daily_logs (date, farm_id) VALUES ('{date}', {farm_var}) ON CONFLICT DO NOTHING RETURNING id INTO v_log_id;")
        lines.append(f"    IF v_log_id IS NULL THEN SELECT id INTO v_log_id FROM daily_logs WHERE date = '{date}' AND farm_id = {farm_var}; END IF;")
        values_str = ", ".join([f"(v_log_id, v_ft_{t}, {amt}, true, v_user_id)" for t, amt in zip(times, amounts)])
        lines.append(f"    INSERT INTO feed_entries (log_id, feeding_time_id, amount, completed, created_by) VALUES \n        {values_str};\n")
    return "\n".join(lines)

sql = f"""-- Run this in Supabase SQL Editor to insert the feed details
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

{generate_inserts('v_farm2_id', data_f2)}

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

{generate_inserts('v_farm3_id', data_f3)}

END $$;
"""
with open(r'c:\Users\vgraj\projects\shrimp-growth-tracker\seed_feed_data.sql', 'w') as f:
    f.write(sql)
print('Done!')
