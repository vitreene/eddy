BEGIN TRANSACTION;

UPDATE event
SET ref = CASE ref
	WHEN 'DEFAULT_IN' THEN 'fade'
	WHEN 'DEFAULT_OUT' THEN 'fade'
	WHEN 'fadeIn' THEN 'fade'
	WHEN 'fadeOut' THEN 'fade'
	WHEN 'swipeLeftIn' THEN 'swipe-left'
	WHEN 'swipeLeftOut' THEN 'swipe-left'
	WHEN 'swipeRightIn' THEN 'swipe-right'
	WHEN 'swipeRightOut' THEN 'swipe-right'
	WHEN 'swipeTopIn' THEN 'swipe-top'
	WHEN 'swipeTopOut' THEN 'swipe-top'
	WHEN 'swipeDownIn' THEN 'swipe-down'
	WHEN 'swipeDownOut' THEN 'swipe-down'
	WHEN 'fadeScaleIn' THEN 'zoom'
	WHEN 'fadeScaleOut' THEN 'zoom'
	WHEN 'none' THEN 'cut'
	ELSE ref
END;

UPDATE capsule
SET default_item_intro_transition = CASE
	WHEN default_item_intro_transition IN (
		'DEFAULT_IN',
		'DEFAULT_OUT',
		'fadeIn',
		'fadeOut',
		'swipeLeftIn',
		'swipeLeftOut',
		'swipeRightIn',
		'swipeRightOut',
		'swipeTopIn',
		'swipeTopOut',
		'swipeDownIn',
		'swipeDownOut',
		'fadeScaleIn',
		'fadeScaleOut',
		'none'
	) THEN JSON_OBJECT(
		'action',
		'intro',
		'ref',
		CASE default_item_intro_transition
			WHEN 'DEFAULT_IN' THEN 'fade'
			WHEN 'DEFAULT_OUT' THEN 'fade'
			WHEN 'fadeIn' THEN 'fade'
			WHEN 'fadeOut' THEN 'fade'
			WHEN 'swipeLeftIn' THEN 'swipe-left'
			WHEN 'swipeLeftOut' THEN 'swipe-left'
			WHEN 'swipeRightIn' THEN 'swipe-right'
			WHEN 'swipeRightOut' THEN 'swipe-right'
			WHEN 'swipeTopIn' THEN 'swipe-top'
			WHEN 'swipeTopOut' THEN 'swipe-top'
			WHEN 'swipeDownIn' THEN 'swipe-down'
			WHEN 'swipeDownOut' THEN 'swipe-down'
			WHEN 'fadeScaleIn' THEN 'zoom'
			WHEN 'fadeScaleOut' THEN 'zoom'
			WHEN 'none' THEN 'cut'
			ELSE 'fade'
		END
	)
	WHEN JSON_VALID(default_item_intro_transition) = 1
		AND JSON_EXTRACT(default_item_intro_transition, '$.ref') IN (
			'DEFAULT_IN',
			'DEFAULT_OUT',
			'fadeIn',
			'fadeOut',
			'swipeLeftIn',
			'swipeLeftOut',
			'swipeRightIn',
			'swipeRightOut',
			'swipeTopIn',
			'swipeTopOut',
			'swipeDownIn',
			'swipeDownOut',
			'fadeScaleIn',
			'fadeScaleOut',
			'none'
		)
	THEN JSON_SET(
		default_item_intro_transition,
		'$.ref',
		CASE JSON_EXTRACT(default_item_intro_transition, '$.ref')
			WHEN 'DEFAULT_IN' THEN 'fade'
			WHEN 'DEFAULT_OUT' THEN 'fade'
			WHEN 'fadeIn' THEN 'fade'
			WHEN 'fadeOut' THEN 'fade'
			WHEN 'swipeLeftIn' THEN 'swipe-left'
			WHEN 'swipeLeftOut' THEN 'swipe-left'
			WHEN 'swipeRightIn' THEN 'swipe-right'
			WHEN 'swipeRightOut' THEN 'swipe-right'
			WHEN 'swipeTopIn' THEN 'swipe-top'
			WHEN 'swipeTopOut' THEN 'swipe-top'
			WHEN 'swipeDownIn' THEN 'swipe-down'
			WHEN 'swipeDownOut' THEN 'swipe-down'
			WHEN 'fadeScaleIn' THEN 'zoom'
			WHEN 'fadeScaleOut' THEN 'zoom'
			WHEN 'none' THEN 'cut'
			ELSE JSON_EXTRACT(default_item_intro_transition, '$.ref')
		END
	)
	ELSE default_item_intro_transition
END;

UPDATE capsule
SET default_item_outro_transition = CASE
	WHEN default_item_outro_transition IN (
		'DEFAULT_IN',
		'DEFAULT_OUT',
		'fadeIn',
		'fadeOut',
		'swipeLeftIn',
		'swipeLeftOut',
		'swipeRightIn',
		'swipeRightOut',
		'swipeTopIn',
		'swipeTopOut',
		'swipeDownIn',
		'swipeDownOut',
		'fadeScaleIn',
		'fadeScaleOut',
		'none'
	) THEN JSON_OBJECT(
		'action',
		'outro',
		'ref',
		CASE default_item_outro_transition
			WHEN 'DEFAULT_IN' THEN 'fade'
			WHEN 'DEFAULT_OUT' THEN 'fade'
			WHEN 'fadeIn' THEN 'fade'
			WHEN 'fadeOut' THEN 'fade'
			WHEN 'swipeLeftIn' THEN 'swipe-left'
			WHEN 'swipeLeftOut' THEN 'swipe-left'
			WHEN 'swipeRightIn' THEN 'swipe-right'
			WHEN 'swipeRightOut' THEN 'swipe-right'
			WHEN 'swipeTopIn' THEN 'swipe-top'
			WHEN 'swipeTopOut' THEN 'swipe-top'
			WHEN 'swipeDownIn' THEN 'swipe-down'
			WHEN 'swipeDownOut' THEN 'swipe-down'
			WHEN 'fadeScaleIn' THEN 'zoom'
			WHEN 'fadeScaleOut' THEN 'zoom'
			WHEN 'none' THEN 'cut'
			ELSE 'fade'
		END
	)
	WHEN JSON_VALID(default_item_outro_transition) = 1
		AND JSON_EXTRACT(default_item_outro_transition, '$.ref') IN (
			'DEFAULT_IN',
			'DEFAULT_OUT',
			'fadeIn',
			'fadeOut',
			'swipeLeftIn',
			'swipeLeftOut',
			'swipeRightIn',
			'swipeRightOut',
			'swipeTopIn',
			'swipeTopOut',
			'swipeDownIn',
			'swipeDownOut',
			'fadeScaleIn',
			'fadeScaleOut',
			'none'
		)
	THEN JSON_SET(
		default_item_outro_transition,
		'$.ref',
		CASE JSON_EXTRACT(default_item_outro_transition, '$.ref')
			WHEN 'DEFAULT_IN' THEN 'fade'
			WHEN 'DEFAULT_OUT' THEN 'fade'
			WHEN 'fadeIn' THEN 'fade'
			WHEN 'fadeOut' THEN 'fade'
			WHEN 'swipeLeftIn' THEN 'swipe-left'
			WHEN 'swipeLeftOut' THEN 'swipe-left'
			WHEN 'swipeRightIn' THEN 'swipe-right'
			WHEN 'swipeRightOut' THEN 'swipe-right'
			WHEN 'swipeTopIn' THEN 'swipe-top'
			WHEN 'swipeTopOut' THEN 'swipe-top'
			WHEN 'swipeDownIn' THEN 'swipe-down'
			WHEN 'swipeDownOut' THEN 'swipe-down'
			WHEN 'fadeScaleIn' THEN 'zoom'
			WHEN 'fadeScaleOut' THEN 'zoom'
			WHEN 'none' THEN 'cut'
			ELSE JSON_EXTRACT(default_item_outro_transition, '$.ref')
		END
	)
	ELSE default_item_outro_transition
END;

COMMIT;
